import { runSiteJob } from "@notra/sites-server/runner";

export async function runSiteJobStep(jobId: string) {
  "use step";
  return await runSiteJob(jobId);
}

runSiteJobStep.maxRetries = 0;
