import type { geoAgentReadinessReports } from "@notra/db/schema";
import type {
  AgentReadinessIssue,
  AgentReadinessReportStatus,
  AgentReadinessScoreBreakdown,
} from "@notra/db/types/agent-readiness";
import type { Effect } from "effect";
import type { infer as ZodInfer } from "zod";

import type { agentReadinessApiReportSchema } from "../schemas/agent-readiness";
import type { AgentReadinessApiError } from "../schemas/agent-readiness-errors";

export type AgentReadinessApiReport = ZodInfer<
  typeof agentReadinessApiReportSchema
>;

export type AgentReadinessReportRow =
  typeof geoAgentReadinessReports.$inferSelect;

export interface AgentReadinessParsedReport {
  score: number | null;
  scoreLabel: string | null;
  scoreBreakdown: AgentReadinessScoreBreakdown | null;
  issues: AgentReadinessIssue[];
  eligibleChecks: number | null;
  reportUrl: string | null;
  scannedAt: Date | null;
}

export interface AgentReadinessScope {
  organizationId: string;
  projectId: string;
  brandSettingsId: string;
}

export interface AgentReadinessReportView {
  id: string;
  status: AgentReadinessReportStatus;
  targetUrl: string;
  score: number | null;
  scoreLabel: string | null;
  scoreBreakdown: AgentReadinessScoreBreakdown | null;
  issues: AgentReadinessIssue[];
  eligibleChecks: number | null;
  reportUrl: string | null;
  errorMessage: string | null;
  scannedAt: string | null;
  createdAt: string;
}

/** One completed scan, compressed for the trend chart. */
export interface AgentReadinessHistoryPoint {
  id: string;
  score: number | null;
  failedCount: number;
  partialCount: number;
  scannedAt: string;
}

/** A check that moved between two completed scans. */
export interface AgentReadinessChangedCheck {
  id: string;
  name: string;
  tier: AgentReadinessIssue["tier"];
  /** Result on the previous scan; null when the check passed. */
  previousResult: AgentReadinessIssue["result"] | null;
  /** Result on the latest scan; null when the check passes now. */
  result: AgentReadinessIssue["result"] | null;
}

/** What changed between the latest completed scan and the one before it. */
export interface AgentReadinessComparison {
  previousScore: number | null;
  previousScannedAt: string;
  /** Open before, passing now. */
  resolved: AgentReadinessChangedCheck[];
  /** Passing before (or not reported), open now. */
  added: AgentReadinessChangedCheck[];
  /** Failed before, partial now. */
  improved: AgentReadinessChangedCheck[];
  /** Partial before, failed now. */
  worsened: AgentReadinessChangedCheck[];
}

export type AgentReadinessIssueChange = "added" | "improved" | "worsened";

export interface AgentReadinessResponse {
  targetUrl: string;
  /** Latest completed report, if any. */
  report: AgentReadinessReportView | null;
  /** Latest run newer than the completed report (running or failed). */
  scan: AgentReadinessReportView | null;
  /** Completed scans, oldest first, for trend detection. */
  history: AgentReadinessHistoryPoint[];
  /** Diff against the previous completed scan; null on the first scan. */
  comparison: AgentReadinessComparison | null;
}

export interface AgentReadinessScanResponse {
  reportId: string;
  alreadyRunning: boolean;
}

export interface AgentReadinessWorkflowPayload {
  organizationId: string;
  projectId: string;
  reportId: string;
  targetUrl: string;
}

export type AgentReadinessWorkflowResult =
  | { status: "completed" }
  | { status: "failed"; reason: string }
  | { status: "invalid_payload" };

export type AgentReadinessScoreBandKey = "great" | "needs-improvement" | "poor";

export interface AgentReadinessScoreBand {
  key: AgentReadinessScoreBandKey;
}

export interface AgentReadinessIssueGroups {
  mustDo: AgentReadinessIssue[];
  shouldDo: AgentReadinessIssue[];
}

export interface AgentReadinessSseEvent {
  type?: string;
}

export interface AgentReadinessSseFrameBoundary {
  index: number;
  length: number;
}

export interface AgentReadinessRunningScan {
  createdAt: Date;
  targetUrl: string;
}
export type AgentReadinessFetch = (
  url: URL,
  init: RequestInit
) => Promise<Response>;

export interface AgentReadinessNetworkShape {
  readonly report: (
    targetUrl: string
  ) => Effect.Effect<AgentReadinessParsedReport | null, AgentReadinessApiError>;
  readonly scan: (
    targetUrl: string
  ) => Effect.Effect<void, AgentReadinessApiError>;
  readonly feedback: (
    targetUrl: string
  ) => Effect.Effect<AgentReadinessIssue | null, AgentReadinessApiError>;
}
