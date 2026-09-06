import type { ContentBillingReservation } from "@notra/ai/types/billing";
import type { Effect } from "effect";

import type { AgentReadinessWorkflowPayload } from "./agent-readiness";
import type {
  FinalizeContentBillingInput,
  GateContentBillingInput,
} from "./content-billing";
import type { ActiveGeneration } from "./generation-tracking";
import type { GeoZdrEntitlement, GeoWriterPayload } from "./geo";

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

export interface GeoFeatureFlagServiceShape {
  readonly isCursorEngineEnabledForOrganization: (
    organizationId: string
  ) => Effect.Effect<boolean>;
  readonly isOpenCodeEngineEnabledForOrganization: (
    organizationId: string
  ) => Effect.Effect<boolean>;
}

export interface GeoGenerationServiceShape {
  readonly addActiveGeneration: (
    organizationId: string,
    generation: ActiveGeneration
  ) => Effect.Effect<void, unknown>;
  readonly generateRunId: (triggerId: string) => Effect.Effect<string>;
}
