import {
  listDispatchableSiteJobs,
  markSiteJobsDispatched,
} from "@notra/sites-server/jobs";
import { reapExhaustedSiteJobs } from "@notra/sites-server/runner";

import { startSiteJobRun } from "@/lib/workflows/start";
import type { SiteJobSweepResult } from "@/types/sites-server";

export async function dispatchSiteJobs(jobIds: string[]): Promise<void> {
  const results = await Promise.allSettled(
    jobIds.map((jobId) => startSiteJobRun(jobId))
  );
  const dispatched: string[] = [];
  for (const [index, result] of results.entries()) {
    const jobId = jobIds[index] as string;
    if (result.status === "fulfilled") {
      dispatched.push(jobId);
      continue;
    }
    console.error("sites.dispatch_failed", {
      jobId,
      error:
        result.reason instanceof Error ? result.reason.message : result.reason,
    });
  }
  if (dispatched.length > 0) {
    await markSiteJobsDispatched(dispatched);
  }
}

export async function sweepSiteJobs(): Promise<SiteJobSweepResult> {
  const [reaped, jobs] = await Promise.all([
    reapExhaustedSiteJobs(),
    listDispatchableSiteJobs(),
  ]);
  await dispatchSiteJobs(jobs.map((job) => job.id));
  return { dispatched: jobs.length, reaped };
}
