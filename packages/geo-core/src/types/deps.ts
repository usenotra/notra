import type { ContentBillingReservation } from "@notra/ai/types/billing";
import type {
  GscIntegrationRow,
  GscQueryRow,
} from "@notra/ai/types/google-search-console";
import type { Effect } from "effect";

import type { GeoFlagEvaluationError } from "../geo/errors";
import type { GeoSearchConsoleError } from "../schemas/search-console-errors";
import type { AgentReadinessWorkflowPayload } from "./agent-readiness";
import type {
  FinalizeContentBillingInput,
  GateContentBillingInput,
} from "./content-billing";
import type { ActiveGeneration } from "./generation-tracking";
import type { GeoZdrEntitlement, GeoWriterPayload } from "./geo";

export interface GeoSearchConsoleServiceShape {
  readonly topQueries: (
    integration: GscIntegrationRow,
    siteUrl: string
  ) => Effect.Effect<GscQueryRow[], GeoSearchConsoleError>;
}

export interface GeoWorkflowServiceShape {
  readonly startGeoScanRun: (payload: {
    organizationId: string;
    projectId?: string;
    claimedAt?: string;
    scanId?: string;
    promptIds?: string[];
    engines?: string[];
  }) => Effect.Effect<{ runId: string }, unknown>;
  readonly startGeoWriterRun: (
    payload: GeoWriterPayload
  ) => Effect.Effect<{ runId: string }, unknown>;
  readonly startAgentReadinessRun: (
    payload: AgentReadinessWorkflowPayload
  ) => Effect.Effect<{ runId: string }, unknown>;
}

export interface GeoContentBillingServiceShape {
  readonly gateContentBilling: (
    input: GateContentBillingInput
  ) => Effect.Effect<ContentBillingReservation, unknown>;
  readonly finalizeContentBilling: (
    input: FinalizeContentBillingInput
  ) => Effect.Effect<void, unknown>;
}

export interface GeoEntitlementServiceShape {
  readonly resolveZdrEntitlement: (
    organizationId: string
  ) => Effect.Effect<GeoZdrEntitlement>;
}

/**
 * A provider that cannot answer fails with `GeoFlagEvaluationError`; callers
 * treat that as "not entitled" for this request without caching the answer.
 */
export interface GeoFeatureFlagServiceShape {
  readonly isCursorEngineEnabledForOrganization: (
    organizationId: string
  ) => Effect.Effect<boolean, GeoFlagEvaluationError>;
  readonly isOpenCodeEngineEnabledForOrganization: (
    organizationId: string
  ) => Effect.Effect<boolean, GeoFlagEvaluationError>;
}

export interface GeoGenerationServiceShape {
  readonly addActiveGeneration: (
    organizationId: string,
    generation: ActiveGeneration
  ) => Effect.Effect<void, unknown>;
  readonly generateRunId: (triggerId: string) => Effect.Effect<string>;
}
