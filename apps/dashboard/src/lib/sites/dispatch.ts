import {
  listDispatchableSiteJobs,
  markSiteJobsDispatched,
} from "@notra/sites-server/jobs";
import { reapExhaustedSiteJobs } from "@notra/sites-server/runner";

import { startSiteJobRun } from "@/lib/workflows/start";

/**
 * Starts a workflow per outbox job. Losing this call is harmless: the job row
 * stays pending and the per-minute sweep dispatches it again.
 */
export async function dispatchSiteJobs(jobIds: string[]): Promise<void> {
  const dispatched: string[] = [];
  for (const jobId of jobIds) {
    try {
      await startSiteJobRun(jobId);
      dispatched.push(jobId);
    } catch (error) {
      console.error("sites.dispatch_failed", {
        jobId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
  if (dispatched.length > 0) {
    await markSiteJobsDispatched(dispatched);
  }
}

export async function sweepSiteJobs(): Promise<{
  dispatched: number;
  reaped: number;
}> {
  const reaped = await reapExhaustedSiteJobs();
  const jobs = await listDispatchableSiteJobs();
  await dispatchSiteJobs(jobs.map((job) => job.id));
  return { dispatched: jobs.length, reaped };
}
