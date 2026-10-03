import { runSiteJobStep } from "./steps/site-job-step";

/** One Notra Sites outbox job (build a deployment, remove a preview). */
export async function siteJobWorkflow(jobId: string) {
  "use workflow";
  return await runSiteJobStep(jobId);
}
