import type { siteJobs } from "@notra/db/schema";

import type { DeploymentOutcome, SiteDeployment } from "./deployments";
import type { Site } from "./sites";

export type SiteJob = typeof siteJobs.$inferSelect;

export type SettingsJobAttempt = Pick<SiteJob, "id" | "attempts">;

export interface SiteJobOutcome {
  status: "done" | "retrying" | "failed" | "skipped";
  outcome?: DeploymentOutcome["kind"];
}

export interface JobDeployment {
  site: Site;
  deployment: SiteDeployment;
}
