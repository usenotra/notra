import { SITE_DEPLOYMENT_PHASES } from "@notra/sites-core/constants/deployment-timeline";
import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import type { SiteBuildMetrics } from "@notra/sites-core/types/build-metrics";
import { Effect, Exit, Option } from "effect";

import { activateDeployment } from "./activation";
import { runSandboxBuildEffect } from "./box-build";
import { saveBuildTelemetryEffect } from "./build-telemetry";
import { CANCELED_OUTCOME } from "./constants/deployments";
import {
  getDeployment,
  hasNewerDeployment,
  transitionDeployment,
} from "./deployments";
import {
  downloadRepositoryTarballEffect,
  getBranchHead,
  siteRepositoryAccess,
} from "./github";
import { publishDeploymentFilesEffect } from "./publish";
import { r2PutEffect } from "./r2";
import { openCheckRun, reportOutcome } from "./reporting";
import type { DeploymentOutcome, SiteDeployment } from "./types/deployments";
import type { SiteRepositoryAccess } from "./types/github";
import type { BuildAndPublishOutcome } from "./types/pipeline";
import type { Site } from "./types/sites";
import { redactBuildLog } from "./utils/build-log";
import { summarizeDiagnostics } from "./utils/diagnostics";
import { errorMessage, isNotFoundError } from "./utils/errors";
import { runSitesEffect } from "./utils/run-sites-effect";

const writeBuildLog = Effect.fn("Sites.writeBuildLog")(function* (
  siteId: string,
  deploymentId: string,
  log: string
) {
  yield* r2PutEffect(SITE_R2_KEYS.buildLog(siteId, deploymentId), log, {
    contentType: "text/plain; charset=utf-8",
  }).pipe(Effect.catch(() => Effect.void));
});

const currentBranchHead = Effect.fn("Sites.currentBranchHead")(function* (
  { repository, token }: SiteRepositoryAccess,
  branch: string
) {
  return yield* Effect.tryPromise({
    try: async () => (await getBranchHead(repository, token, branch)).sha,
    catch: (error) => error,
  }).pipe(Effect.catchIf(isNotFoundError, () => Effect.succeed(null)));
});

const whyNotBuild = Effect.fn("Sites.whyNotBuild")(function* (
  access: SiteRepositoryAccess,
  deployment: SiteDeployment
) {
  if (deployment.status !== "queued") {
    return null;
  }
  const head = yield* currentBranchHead(access, deployment.branch);
  const fromWebhook =
    deployment.trigger === "push" || deployment.trigger === "pull_request";
  if (fromWebhook && head !== deployment.commitSha) {
    return head
      ? `${deployment.branch} moved on to ${head.slice(0, 7)}.`
      : `${deployment.branch} no longer exists.`;
  }
  if (
    yield* Effect.tryPromise({
      try: () => hasNewerDeployment(deployment, head),
      catch: (error) => error,
    })
  ) {
    return "A newer deployment replaces this one.";
  }
  return null;
});

const buildAndPublish = Effect.fn("Sites.buildAndPublish")(function* (
  site: Site,
  deployment: SiteDeployment
) {
  if (site.status !== "active") {
    yield* Effect.uninterruptible(
      Effect.tryPromise({
        try: () =>
          transitionDeployment(deployment.id, "canceled", {
            finishedAt: new Date(),
            errorMessage: "Site is suspended",
          }),
        catch: (error) => error,
      })
    );
    return {
      outcome: { kind: "skipped" as const, reason: "The site is offline." },
      pendingTelemetryError: Option.none<unknown>(),
    } satisfies BuildAndPublishOutcome;
  }
  const startedAt = new Date();

  let phaseTimestamp = startedAt.getTime();
  let phaseLog = `[deployment:${SITE_DEPLOYMENT_PHASES[0]}] ${startedAt.toISOString()}\n`;
  const measurementStart = performance.now();
  let metrics: SiteBuildMetrics = {
    version: 1,
    provider: "upstash",
    snapshotId: null,
    sandboxId: null,
    requestedSize: "medium",
    sourceArchiveBytes: 0,
    outputArchiveBytes: null,
    totalDurationMs: 0,
    phases: {},
  };
  let sandboxLog = "";
  let telemetryAvailable = false;
  let accessToken = "";
  const operation = Effect.gen(function* () {
    const accessStarted = performance.now();
    const access = yield* Effect.tryPromise({
      try: () => siteRepositoryAccess(site, { contents: "read" }),
      catch: (error) => error,
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          metrics.phases.repositoryAccess = performance.now() - accessStarted;
        })
      )
    );
    accessToken = access.token;
    const skipReason = yield* whyNotBuild(access, deployment);
    if (skipReason) {
      yield* Effect.uninterruptible(
        Effect.tryPromise({
          try: () =>
            transitionDeployment(deployment.id, "superseded", {
              finishedAt: new Date(),
              errorMessage: skipReason,
            }),
          catch: (error) => error,
        })
      );
      return { kind: "skipped" as const, reason: skipReason };
    }
    if (
      !(yield* Effect.uninterruptible(
        Effect.tryPromise({
          try: () =>
            transitionDeployment(deployment.id, "building", {
              startedAt: deployment.startedAt ?? startedAt,
            }),
          catch: (error) => error,
        })
      ))
    ) {
      return CANCELED_OUTCOME;
    }
    yield* writeBuildLog(site.id, deployment.id, phaseLog);
    const sourceStarted = performance.now();
    const sourceArchive = yield* downloadRepositoryTarballEffect(
      access.repository,
      access.token,
      deployment.commitSha
    ).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          metrics.phases.sourceDownload = performance.now() - sourceStarted;
        })
      )
    );
    metrics.sourceArchiveBytes = sourceArchive.byteLength;
    phaseTimestamp = Math.max(phaseTimestamp, Date.now());
    phaseLog += `[deployment:${SITE_DEPLOYMENT_PHASES[1]}] ${new Date(phaseTimestamp).toISOString()}\n`;
    yield* writeBuildLog(site.id, deployment.id, phaseLog);
    const build = yield* runSandboxBuildEffect({
      sourceArchive,
      rootDirectory: site.rootDirectory,
      target: {
        siteId: site.id,
        deploymentId: deployment.id,
        commitSha: deployment.commitSha,
        publicOrigin: deployment.target.publicOrigin,
        mounts: deployment.target.mounts,
        noindex: deployment.target.noindex,
        includeDrafts: deployment.kind === "preview",
        analytics: deployment.kind === "production",
        branding: deployment.target.branding !== false,
        defaultConfig: deployment.target.defaultConfig,
      },
      onLog: (log) =>
        Effect.gen(function* () {
          sandboxLog = redactBuildLog(log, [access.token]);
          yield* writeBuildLog(site.id, deployment.id, phaseLog + sandboxLog);
        }),
      onComplete: (completed) =>
        Effect.gen(function* () {
          sandboxLog = redactBuildLog(completed.log, [access.token]);
          if (completed.metrics) {
            metrics = {
              ...completed.metrics,
              phases: { ...metrics.phases, ...completed.metrics.phases },
              totalDurationMs: performance.now() - measurementStart,
            };
            telemetryAvailable = true;
            yield* saveBuildTelemetryEffect(
              deployment.id,
              metrics,
              phaseLog + sandboxLog
            );
          }
        }),
    });
    sandboxLog = redactBuildLog(build.log, [access.token]);
    if (build.metrics) {
      metrics = {
        ...build.metrics,
        phases: { ...metrics.phases, ...build.metrics.phases },
      };
      telemetryAvailable = true;
    }
    yield* writeBuildLog(site.id, deployment.id, phaseLog + sandboxLog);

    const result = build.result;
    if (!(result?.ok && build.outputArchive)) {
      const diagnostics = result?.diagnostics ?? [
        {
          severity: "error" as const,
          file: null,
          code: "build_crashed",
          message: build.crash ?? "The build failed.",
        },
      ];
      const summary = summarizeDiagnostics(diagnostics);
      yield* Effect.uninterruptible(
        Effect.tryPromise({
          try: () =>
            transitionDeployment(deployment.id, "failed", {
              finishedAt: new Date(),
              diagnostics,
              errorMessage: summary.slice(0, 4000),
              buildDurationMs: build.durationMs,
              toolchainVersion: build.toolchainVersion,
            }),
          catch: (error) => error,
        })
      );
      return { kind: "failed" as const, summary, diagnostics };
    }

    if (
      !(yield* Effect.uninterruptible(
        Effect.tryPromise({
          try: () => transitionDeployment(deployment.id, "uploading"),
          catch: (error) => error,
        })
      ))
    ) {
      return CANCELED_OUTCOME;
    }
    phaseTimestamp = Math.max(phaseTimestamp, Date.now());
    phaseLog += `[deployment:${SITE_DEPLOYMENT_PHASES[2]}] ${new Date(phaseTimestamp).toISOString()}\n`;
    yield* writeBuildLog(site.id, deployment.id, phaseLog + sandboxLog);
    const publishStarted = performance.now();
    const manifest = yield* publishDeploymentFilesEffect({
      site,
      deployment,
      archive: build.outputArchive,
      result,
      toolchainVersion: build.toolchainVersion,
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          metrics.phases.publish = performance.now() - publishStarted;
        })
      )
    );
    const ready = yield* Effect.uninterruptible(
      Effect.tryPromise({
        try: () =>
          transitionDeployment(deployment.id, "ready", {
            fileCount: manifest.files.length,
            totalBytes: manifest.totalBytes,
            buildDurationMs: build.durationMs,
            toolchainVersion: build.toolchainVersion,
            diagnostics: result.diagnostics,
            finishedAt: new Date(),
          }),
        catch: (error) => error,
      })
    );
    return ready ? null : CANCELED_OUTCOME;
  });
  return yield* Effect.uninterruptibleMask((restore) =>
    Effect.gen(function* () {
      const result = yield* Effect.exit(restore(operation));
      let pendingTelemetryError = Option.none<unknown>();
      if (Exit.isFailure(result)) {
        telemetryAvailable = true;
        const failure = result.cause.reasons.find(
          (reason) => reason._tag === "Fail"
        );
        sandboxLog += `\n[deployment:error] ${redactBuildLog(failure?._tag === "Fail" ? errorMessage(failure.error) : "The deployment was interrupted or encountered a defect.", [accessToken, process.env.UPSTASH_BOX_API_KEY ?? ""])}\n`;
      }
      if (telemetryAvailable) {
        metrics.totalDurationMs = performance.now() - measurementStart;
        const log = phaseLog + sandboxLog;
        yield* writeBuildLog(site.id, deployment.id, log);
        yield* saveBuildTelemetryEffect(deployment.id, metrics, log).pipe(
          Effect.catch((error) => {
            if (Exit.isSuccess(result)) {
              if (result.value !== null) {
                return Effect.fail(error);
              }
              pendingTelemetryError = Option.some(error);
            }
            const persistenceFailure = redactBuildLog(errorMessage(error), [
              accessToken,
              process.env.UPSTASH_BOX_API_KEY ?? "",
            ]);
            return writeBuildLog(
              site.id,
              deployment.id,
              `${log}\n[telemetry:persistence] ${persistenceFailure}\n`
            );
          })
        );
      }
      return {
        outcome: yield* result,
        pendingTelemetryError,
      } satisfies BuildAndPublishOutcome;
    })
  );
});

const activationOutcome = Effect.fn("Sites.activationOutcome")(function* (
  site: Site,
  deployment: SiteDeployment
) {
  const live =
    site.status === "active" &&
    (yield* Effect.uninterruptible(
      Effect.tryPromise({
        try: () => activateDeployment(site, deployment),
        catch: (error) => error,
      })
    )) === "live";
  return live ? { kind: "live" as const } : { kind: "not_live" as const };
});

export const runDeploymentPipelineEffect = Effect.fn(
  "Sites.runDeploymentPipeline"
)(function* (site: Site, queued: SiteDeployment) {
  const deployment = yield* Effect.tryPromise({
    try: () => openCheckRun(site, queued),
    catch: (error) => error,
  });
  const build =
    deployment.status === "ready"
      ? { outcome: null, pendingTelemetryError: Option.none<unknown>() }
      : yield* buildAndPublish(site, deployment);
  const finished =
    (yield* Effect.tryPromise({
      try: () => getDeployment(deployment.id),
      catch: (error) => error,
    })) ?? deployment;
  const outcome: DeploymentOutcome =
    build.outcome ?? (yield* activationOutcome(site, finished));
  yield* Effect.tryPromise({
    try: () => reportOutcome(site, finished, outcome),
    catch: (error) => error,
  });
  if (Option.isSome(build.pendingTelemetryError)) {
    return yield* Effect.fail(build.pendingTelemetryError.value);
  }
  return outcome;
});

export function runDeploymentPipeline(
  site: Site,
  queued: SiteDeployment
): Promise<DeploymentOutcome> {
  return runSitesEffect(runDeploymentPipelineEffect(site, queued));
}

export async function failDeployment(
  site: Site,
  deployment: SiteDeployment,
  message: string
): Promise<void> {
  if (
    !(await transitionDeployment(deployment.id, "failed", {
      finishedAt: new Date(),
      errorMessage: message.slice(0, 4000),
    }))
  ) {
    return;
  }
  await reportOutcome(site, deployment, {
    kind: "failed",
    summary: message,
    diagnostics: [],
  });
}
