import type { GeoTrafficEventRow } from "@notra/analytics/tinybird/datasources";
import type { AgentReadinessWorkflowPayload } from "@notra/geo-core/types/agent-readiness";
import type {
  GeoIngestIdentity,
  GeoSuggestionKeyword,
} from "@notra/geo-core/types/geo";
import type { PostHogEventName } from "@notra/posthog/events";
import type { PostHogProperties } from "@notra/posthog/types/posthog";
import type { GEO_SCAN_TRIGGERS } from "@notra/schemas/constants/dashboard/geo-analytics";

import type {
  AGENT_READINESS_ERROR_KINDS,
  AGENT_READINESS_FIX_COPY_KINDS,
  GEO_COMPETITOR_DETAIL_SURFACES,
  GEO_COMPETITOR_SOURCES,
  GEO_PROMPT_DETAIL_SURFACES,
  GEO_PROMPT_SOURCES,
  GEO_WRITE_DIALOG_ENTRIES,
  GEO_WRITER_FAILURE_REASONS,
  TRAFFIC_INSTALL_COPY_KINDS,
  TRAFFIC_LOG_FILTER_KINDS,
} from "@/constants/geo-analytics";
import type { AuthenticatedUser } from "@/types/auth/organization";

export type GeoScanTrigger = (typeof GEO_SCAN_TRIGGERS)[number];

export type GeoPromptSource =
  (typeof GEO_PROMPT_SOURCES)[keyof typeof GEO_PROMPT_SOURCES];

export type GeoCompetitorSource =
  (typeof GEO_COMPETITOR_SOURCES)[keyof typeof GEO_COMPETITOR_SOURCES];

export type GeoPromptDetailSurface =
  (typeof GEO_PROMPT_DETAIL_SURFACES)[keyof typeof GEO_PROMPT_DETAIL_SURFACES];

export type GeoCompetitorDetailSurface =
  (typeof GEO_COMPETITOR_DETAIL_SURFACES)[keyof typeof GEO_COMPETITOR_DETAIL_SURFACES];

export type GeoWriteDialogEntry =
  (typeof GEO_WRITE_DIALOG_ENTRIES)[keyof typeof GEO_WRITE_DIALOG_ENTRIES];

export type GeoWriterFailureReason =
  (typeof GEO_WRITER_FAILURE_REASONS)[keyof typeof GEO_WRITER_FAILURE_REASONS];

export type AgentReadinessErrorKind =
  (typeof AGENT_READINESS_ERROR_KINDS)[keyof typeof AGENT_READINESS_ERROR_KINDS];

export type AgentReadinessFixCopyKind =
  (typeof AGENT_READINESS_FIX_COPY_KINDS)[keyof typeof AGENT_READINESS_FIX_COPY_KINDS];

export type TrafficInstallCopyKind =
  (typeof TRAFFIC_INSTALL_COPY_KINDS)[keyof typeof TRAFFIC_INSTALL_COPY_KINDS];

export type TrafficLogFilterKind =
  (typeof TRAFFIC_LOG_FILTER_KINDS)[keyof typeof TRAFFIC_LOG_FILTER_KINDS];

export interface GeoRouterTrackContext {
  headers: Headers;
  user?: AuthenticatedUser | null;
}

export interface GeoRouterScopeInput {
  organizationId: string;
  projectId?: string;
}

export interface GeoRouterTrackInput {
  context: GeoRouterTrackContext;
  input: GeoRouterScopeInput;
  event: PostHogEventName;
  projectId?: string | null;
  properties?: PostHogProperties;
}

export interface GeoHandlerTrackParams<TInput, TOutput> {
  context: GeoRouterTrackContext;
  input: TInput;
  output: TOutput;
}

export type GeoHandlerTracker<TInput, TOutput> = (
  params: GeoHandlerTrackParams<TInput, TOutput>
) => void | Promise<void>;

export interface GeoScanStartSnapshot {
  prompt_count: number;
  engine_count: number;
  language_count: number;
  is_first_scan: boolean;
  zdr_enforced: boolean;
}

export interface GeoSuggestionKeywordSummary {
  impressions: number;
  clicks: number;
  position: number | null;
}

export type GeoSuggestionKeywordList = readonly GeoSuggestionKeyword[];

export type GeoScanTrackResult =
  | { status: "completed"; checks?: number; mentions?: number }
  | { status: "skipped" }
  | { status: "invalid_payload" }
  | {
      status: "retry_no_successful_checks";
      checks: number;
      retryProjectIds: string[];
    };

export interface GeoScanStepTrackInput {
  organizationId: string;
  projectId?: string;
  scanId?: string;
  result: GeoScanTrackResult;
  durationMs: number;
  retried: boolean;
}

export interface GeoScanFailureTrackInput {
  organizationId: string;
  projectId?: string;
  scanId?: string;
  reason: string;
  durationMs: number;
  retried: boolean;
}

export interface GeoWriterOutcomeTrackInput {
  organizationId: string;
  projectId: string;
  briefId: string;
  runId: string;
  startedAt: Date | null;
}

export interface GeoWriterCompletedTrackInput extends GeoWriterOutcomeTrackInput {
  postId: string;
  humanized: boolean;
}

export interface GeoWriterFailedTrackInput extends GeoWriterOutcomeTrackInput {
  reason: GeoWriterFailureReason;
}

export interface GeoWriterSkippedStepInput {
  organizationId: string;
  projectId: string;
  briefId: string;
  runId: string;
  reason: GeoWriterFailureReason;
}

export interface AgentReadinessScanTrackInput {
  payload: AgentReadinessWorkflowPayload;
  status: "completed" | "failed" | "invalid_payload";
  reason?: string;
  durationMs: number;
}

export interface GeoIngestAnalyticsInput {
  identity: GeoIngestIdentity;
  event: GeoTrafficEventRow;
}
