import { runSiteJobStep } from "./steps/site-job-step";

export async function siteJobWorkflow(jobId: string) {
  "use workflow";
  return await runSiteJobStep(jobId);
}
