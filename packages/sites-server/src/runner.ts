import { db } from "@notra/db/drizzle";
import { siteJobs } from "@notra/db/schema";
import { eq } from "drizzle-orm";

import { BUILDABLE_STATUSES } from "./constants/jobs";
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
  takeExhaustedSiteJobs,
} from "./jobs";
import { failDeployment, runDeploymentPipeline } from "./pipeline";
import { removePreviewDeployment } from "./state";
import type { JobDeployment, SiteJob, SiteJobOutcome } from "./types/jobs";
import { errorMessage } from "./utils/errors";

async function loadJobDeployment(job: SiteJob): Promise<JobDeployment | null> {
  const deployment = job.deploymentId
    ? await getDeployment(job.deploymentId)
    : null;
  const site = deployment ? await getSite(deployment.siteId) : null;
  return deployment && site ? { site, deployment } : null;
}

async function runBuildJob(job: SiteJob): Promise<SiteJobOutcome> {
  const loaded = await loadJobDeployment(job);
  if (!(loaded && BUILDABLE_STATUSES.has(loaded.deployment.status))) {
    await completeSiteJob(job.id);
    return { status: "skipped" };
  }
  const outcome = await runDeploymentPipeline(loaded.site, loaded.deployment);
  await completeSiteJob(job.id);
  return { status: "done", outcome: outcome.kind };
}

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
  const loaded = await loadJobDeployment(job);
  if (loaded) {
    await failDeployment(loaded.site, loaded.deployment, message);
  }
}

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
    const message = errorMessage(error);
    console.error("sites.job_failed", {
      jobId,
      error: error instanceof Error ? error.stack : message,
    });
    const permanent = error instanceof SitePermanentBuildError;
    const result = await failSiteJob(job, error, permanent);
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

export async function reapExhaustedSiteJobs(): Promise<number> {
  const jobs = await takeExhaustedSiteJobs();
  await Promise.all(
    jobs.map((job) =>
      failJobDeployment(
        job,
        "The build stopped responding and ran out of retries. Redeploy to try again."
      )
    )
  );
  return jobs.length;
}
