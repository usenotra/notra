import { runSiteJob } from "@notra/sites-server/runner";

export async function runSiteJobStep(jobId: string) {
  "use step";
  return await runSiteJob(jobId);
}

// The job row carries its own lease, attempts and backoff; the cron sweep
// re-dispatches it. A workflow-level retry would only race that.
runSiteJobStep.maxRetries = 0;
