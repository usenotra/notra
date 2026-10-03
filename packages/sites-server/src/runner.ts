import { db } from "@notra/db/drizzle";
import { siteJobs } from "@notra/db/schema";
import { eq } from "drizzle-orm";

import {
  allocateGeneration,
  cancelPreviewBuilds,
  getDeployment,
  getSite,
} from "./deployments";
import { SitePermanentBuildError } from "./errors";
import {
  claimSiteJob,
  completeSiteJob,
  failSiteJob,
  reserveBuildCapacity,
  type SiteJob,
  takeExhaustedSiteJobs,
} from "./jobs";
import { failDeployment, runDeploymentPipeline } from "./pipeline";
import type { DeploymentOutcome } from "./reporting";
import { removePreviewDeployment } from "./state";

const BUILDABLE_STATUSES = new Set([
  "queued",
  "building",
  "uploading",
  "ready",
]);

export interface SiteJobOutcome {
  status: "done" | "retrying" | "failed" | "skipped";
  outcome?: DeploymentOutcome["kind"];
}

async function runBuildJob(job: SiteJob): Promise<SiteJobOutcome> {
  const deployment = job.deploymentId
    ? await getDeployment(job.deploymentId)
    : null;
  const site = deployment ? await getSite(deployment.siteId) : null;
  if (!(deployment && site && BUILDABLE_STATUSES.has(deployment.status))) {
    await completeSiteJob(job.id);
    return { status: "skipped" };
  }
  const outcome = await runDeploymentPipeline(site, deployment);
  await completeSiteJob(job.id);
  return { status: "done", outcome: outcome.kind };
}

/**
 * Removes a preview behind a tombstone with its own generation: builds of that
 * preview that are still running can no longer activate it afterwards.
 */
async function runRemovePreviewJob(job: SiteJob): Promise<SiteJobOutcome> {
  const site = await getSite(job.siteId);
  const previewKey =
    "previewKey" in job.payload ? job.payload.previewKey : null;
  if (site && previewKey) {
    const { lastGeneration } = await allocateGeneration(db, site.id);
    await removePreviewDeployment(site, previewKey, lastGeneration);
    await cancelPreviewBuilds(site.id, previewKey);
  }
  await completeSiteJob(job.id);
  return { status: "done" };
}

async function failJobDeployment(job: SiteJob, message: string): Promise<void> {
  const deployment = job.deploymentId
    ? await getDeployment(job.deploymentId)
    : null;
  const site = deployment ? await getSite(deployment.siteId) : null;
  if (deployment && site) {
    await failDeployment(site, deployment, message);
  }
}

/**
 * Entry point for a dispatched job. Safe to call more than once for the same
 * job: only the caller that wins the lease does any work.
 */
export async function runSiteJob(jobId: string): Promise<SiteJobOutcome> {
  const [pending] = await db
    .select()
    .from(siteJobs)
    .where(eq(siteJobs.id, jobId))
    .limit(1);
  if (
    pending?.kind === "build" &&
    pending.status === "pending" &&
    !(await reserveBuildCapacity(pending))
  ) {
    return { status: "retrying" };
  }
  const job = await claimSiteJob(jobId);
  if (!job) {
    return { status: "skipped" };
  }
  try {
    return job.kind === "remove_preview"
      ? await runRemovePreviewJob(job)
      : await runBuildJob(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("sites.job_failed", {
      jobId,
      error: error instanceof Error ? error.stack : message,
    });
    const permanent = error instanceof SitePermanentBuildError;
    const result = await failSiteJob(job, error, { permanent });
    if (result === "failed") {
      await failJobDeployment(
        job,
        permanent
          ? message
          : `Deployment failed after ${job.attempts} attempts: ${message}`
      );
    }
    return { status: result };
  }
}

/** Called by the sweep: fails jobs whose worker died on their last attempt. */
export async function reapExhaustedSiteJobs(): Promise<number> {
  const jobs = await takeExhaustedSiteJobs();
  for (const job of jobs) {
    await failJobDeployment(
      job,
      "The build stopped responding and ran out of retries. Redeploy to try again."
    );
  }
  return jobs.length;
}
