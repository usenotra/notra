import { SITE_DEPLOYMENT_PHASES } from "@notra/sites-core/constants/deployment-timeline";
import {
  SITE_DEPLOYMENT_IN_PROGRESS_STATUSES,
  SITE_R2_KEYS,
} from "@notra/sites-core/constants/sites";
import type { SiteBuildMetrics } from "@notra/sites-core/types/build-metrics";
import { Effect, Exit, Option } from "effect";

import { activateDeployment } from "./activation";
import { runSandboxBuildEffect } from "./box-build";
import { saveBuildTelemetryEffect } from "./build-telemetry";
import { CANCELED_OUTCOME } from "./constants/deployments";
import { SMART_DEPLOYMENT_SKIP_REASON } from "./constants/smart-deployments";
import {
  getDeployment,
  hasNewerDeployment,
  startDeploymentBuild,
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
import {
  compareSmartDeployment,
  skipUnchangedDeployment,
} from "./smart-deployments";
import type { DeploymentOutcome, SiteDeployment } from "./types/deployments";
import type { SiteRepositoryAccess } from "./types/github";
import type { BuildAndPublishOutcome } from "./types/pipeline";
import type { Site } from "./types/sites";
import type { SmartDeploymentComparison } from "./types/smart-deployments";
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
  if (
    !SITE_DEPLOYMENT_IN_PROGRESS_STATUSES.some(
      (status) => status === deployment.status
    )
  ) {
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
  let smartComparison: SmartDeploymentComparison | null = null;
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
    let skipReason = yield* whyNotBuild(access, deployment);
    if (!skipReason) {
      smartComparison = yield* Effect.tryPromise({
        try: () => compareSmartDeployment(site, deployment, access),
        catch: (error) => error,
      });
      // The head or a newer deployment may change during comparison.
      skipReason = yield* whyNotBuild(access, deployment);
    }
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
    // A failed skip may already have advanced R2. Retry instead of building.
    if (
      yield* Effect.uninterruptible(
        Effect.tryPromise({
          try: () => skipUnchangedDeployment(site, deployment, smartComparison),
          catch: (error) => error,
        })
      )
    ) {
      phaseLog += `[deployment:skipped] ${SMART_DEPLOYMENT_SKIP_REASON}\n`;
      yield* writeBuildLog(site.id, deployment.id, phaseLog);
      return { kind: "skipped" as const, reason: SMART_DEPLOYMENT_SKIP_REASON };
    }
    if (
      !(yield* Effect.uninterruptible(
        Effect.tryPromise({
          try: () => startDeploymentBuild(deployment, startedAt),
          catch: (error) => error,
        })
      ))
    ) {
      const current = yield* Effect.tryPromise({
        try: () => getDeployment(deployment.id),
        catch: (error) => error,
      });
      if (current?.status === "failed") {
        return {
          kind: "failed" as const,
          summary: current.errorMessage ?? "The build failed.",
          diagnostics: current.diagnostics ?? [],
        };
      }
      if (current?.status === "skipped") {
        return {
          kind: "skipped" as const,
          reason: current.skipReason ?? SMART_DEPLOYMENT_SKIP_REASON,
        };
      }
      return (current?.status === "canceled" ||
        current?.status === "superseded") &&
        current.errorMessage
        ? { kind: "skipped" as const, reason: current.errorMessage }
        : CANCELED_OUTCOME;
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
      snapshotId: smartComparison?.snapshotId ?? undefined,
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
              smartDeploymentEvaluation: smartComparison?.evaluation ?? null,
            }),
          catch: (error) => error,
        })
      );
      return { kind: "failed" as const, summary, diagnostics };
    }

    // Compilation can outlast the branch head or a newer deployment.
    skipReason = yield* whyNotBuild(access, deployment);
    if (skipReason) {
      yield* Effect.uninterruptible(
        Effect.tryPromise({
          try: () =>
            transitionDeployment(deployment.id, "superseded", {
              finishedAt: new Date(),
              errorMessage: skipReason,
              buildDurationMs: build.durationMs,
              toolchainVersion: build.toolchainVersion,
              smartDeploymentEvaluation: smartComparison?.evaluation ?? null,
            }),
          catch: (error) => error,
        })
      );
      return { kind: "skipped" as const, reason: skipReason };
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
            inputFingerprint:
              smartComparison?.year === new Date().getUTCFullYear() &&
              smartComparison.snapshotId === build.metrics?.snapshotId
                ? smartComparison.fingerprint
                : null,
            smartDeploymentEvaluation: smartComparison?.evaluation ?? null,
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
  let build: BuildAndPublishOutcome;
  if (deployment.status === "skipped") {
    build = {
      outcome: {
        kind: "skipped",
        reason: deployment.skipReason ?? SMART_DEPLOYMENT_SKIP_REASON,
      },
      pendingTelemetryError: Option.none<unknown>(),
    };
  } else if (deployment.status === "ready") {
    build = { outcome: null, pendingTelemetryError: Option.none<unknown>() };
  } else {
    build = yield* buildAndPublish(site, deployment);
  }
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
