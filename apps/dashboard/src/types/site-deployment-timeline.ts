import type { SITE_DEPLOYMENT_PHASES } from "@notra/sites-core/constants/deployment-timeline";

import type { SiteDeploymentRecord } from "@/types/sites";

export type SiteDeploymentPhaseId =
  | (typeof SITE_DEPLOYMENT_PHASES)[number]
  | "queued"
  | "execution";

export type SiteDeploymentPhaseState =
  | "pending"
  | "active"
  | "complete"
  | "unknown"
  | "failed"
  | "stopped";

export interface SiteDeploymentTimelinePhase {
  id: SiteDeploymentPhaseId;
  state: SiteDeploymentPhaseState;
  startedAt: number | null;
  durationMs: number | null;
}

export type SiteDeploymentTimelineRecord = Pick<
  SiteDeploymentRecord,
  "createdAt" | "startedAt" | "finishedAt" | "status"
>;
