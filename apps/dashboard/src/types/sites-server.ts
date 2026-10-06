import type { siteDeployments, siteDomains } from "@notra/db/schema";
import type { Site } from "@notra/sites-server/types/sites";

export type SiteDeploymentDbRow = typeof siteDeployments.$inferSelect;
export type SiteDomainDbRow = typeof siteDomains.$inferSelect;

export type LiveDeployments = Map<string, string>;

export interface SiteRequestContext {
  headers: Headers;
}

export interface SiteAccessOptions {
  admin?: boolean;
}

export interface SiteAccess {
  site: Site;
  userId: string;
}

export interface SiteJobSweepResult {
  dispatched: number;
  reaped: number;
}

export interface SiteJobRunHandle {
  runId: string;
}
