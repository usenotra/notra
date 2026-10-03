import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";

import { activateDeployment } from "./activation";
import { runSandboxBuild } from "./box-build";
import {
  getDeployment,
  hasNewerDeployment,
  type Site,
  type SiteDeployment,
  transitionDeployment,
} from "./deployments";
import {
  downloadRepositoryTarball,
  getBranchHead,
  requireSiteRepository,
  siteRepositoryToken,
} from "./github";
import { publishDeploymentFiles } from "./publish";
import { r2Put } from "./r2";
import {
  type DeploymentOutcome,
  openCheckRun,
  reportOutcome,
  summarizeDiagnostics,
} from "./reporting";

/** The same object is overwritten while the build runs, so the dashboard can tail it. */
async function writeBuildLog(
  siteId: string,
  deploymentId: string,
  log: string
) {
  await r2Put(SITE_R2_KEYS.buildLog(siteId, deploymentId), log, {
    contentType: "text/plain; charset=utf-8",
  });
}

const CANCELED: DeploymentOutcome = {
  kind: "skipped",
  reason: "The preview was closed while it was building.",
};

/**
 * Webhooks arrive late, out of order or redelivered. A push/PR build whose
 * commit is no longer its branch head would publish older content under a
 * newer generation; the push that moved the branch has its own deployment.
 */
async function branchMovedOn(
  site: Site,
  deployment: SiteDeployment,
  token: string
): Promise<string | null> {
  if (
    !(deployment.trigger === "push" || deployment.trigger === "pull_request")
  ) {
    return null;
  }
  const head = await getBranchHead(
    requireSiteRepository(site),
    token,
    deployment.branch
  ).catch((error: unknown) => {
    if ((error as { status?: number }).status === 404) {
      return null;
    }
    throw error;
  });
  if (head?.sha === deployment.commitSha) {
    return null;
  }
  return head
    ? `${deployment.branch} moved on to ${head.sha.slice(0, 7)}.`
    : `${deployment.branch} no longer exists.`;
}

async function whyNotBuild(
  site: Site,
  deployment: SiteDeployment,
  token: string
): Promise<string | null> {
  if (deployment.status !== "queued") {
    return null;
  }
  if (await hasNewerDeployment(deployment)) {
    return "A newer deployment replaces this one.";
  }
  return await branchMovedOn(site, deployment, token);
}

/**
 * Sandbox build + upload. Returns an outcome when the deployment ends here
 * (skipped, failed, canceled meanwhile); null when it is `ready` to go live.
 * Every status change is a guarded transition, so a concurrent cancel always wins.
 */
async function buildAndPublish(
  site: Site,
  deployment: SiteDeployment
): Promise<DeploymentOutcome | null> {
  if (site.status !== "active") {
    await transitionDeployment(deployment.id, "canceled", {
      finishedAt: new Date(),
      errorMessage: "Site is suspended",
    });
    return { kind: "skipped", reason: "The site is offline." };
  }
  const repository = requireSiteRepository(site);
  const token = await siteRepositoryToken(repository, { contents: "read" });
  const skipReason = await whyNotBuild(site, deployment, token);
  if (skipReason) {
    await transitionDeployment(deployment.id, "superseded", {
      finishedAt: new Date(),
      errorMessage: skipReason,
    });
    return { kind: "skipped", reason: skipReason };
  }
  if (
    !(await transitionDeployment(deployment.id, "building", {
      startedAt: deployment.startedAt ?? new Date(),
    }))
  ) {
    return CANCELED;
  }

  const sourceArchive = await downloadRepositoryTarball(
    repository,
    token,
    deployment.commitSha
  );
  const build = await runSandboxBuild({
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
    },
    onLog: (log) => writeBuildLog(site.id, deployment.id, log),
  });
  await writeBuildLog(site.id, deployment.id, build.log).catch(() => undefined);

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
    await transitionDeployment(deployment.id, "failed", {
      finishedAt: new Date(),
      diagnostics,
      errorMessage: summary.slice(0, 4000),
      buildDurationMs: build.durationMs,
      toolchainVersion: build.toolchainVersion,
    });
    return { kind: "failed", summary, diagnostics };
  }

  if (!(await transitionDeployment(deployment.id, "uploading"))) {
    return CANCELED;
  }
  const manifest = await publishDeploymentFiles({
    site,
    deployment,
    archive: build.outputArchive,
    result,
    toolchainVersion: build.toolchainVersion,
  });
  const ready = await transitionDeployment(deployment.id, "ready", {
    fileCount: manifest.files.length,
    totalBytes: manifest.totalBytes,
    buildDurationMs: build.durationMs,
    toolchainVersion: build.toolchainVersion,
    diagnostics: result.diagnostics,
    finishedAt: new Date(),
  });
  return ready ? null : CANCELED;
}

/**
 * One deployment, start to finish: decide → build → publish → activate → report.
 * Resumable: a deployment that crashed after its upload (`ready`) skips straight to activation.
 */
export async function runDeploymentPipeline(
  site: Site,
  queued: SiteDeployment
): Promise<DeploymentOutcome> {
  const deployment = await openCheckRun(site, queued);
  const ended =
    deployment.status === "ready"
      ? null
      : await buildAndPublish(site, deployment);
  const finished = (await getDeployment(deployment.id)) ?? deployment;
  let outcome: DeploymentOutcome;
  if (ended) {
    outcome = ended;
  } else if (
    site.status === "active" &&
    (await activateDeployment(site, finished)) === "live"
  ) {
    outcome = { kind: "live" };
  } else {
    outcome = { kind: "not_live" };
  }
  await reportOutcome(site, finished, outcome);
  return outcome;
}

/** Final failure outside the build itself (crash on the last attempt, permanent error). */
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
