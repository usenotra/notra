import {
  GEO_CURSOR_FLAG_KEY,
  GEO_OPENCODE_FLAG_KEY,
} from "@notra/geo-core/constants/geo";
import {
  GeoContentBillingService,
  GeoEntitlementService,
  GeoFeatureFlagService,
  GeoGenerationService,
  GeoWorkflowService,
} from "@notra/geo-core/deps";
import { agentReadinessNetworkLive } from "@notra/geo-core/geo/agent-readiness-live";
import { geoModelLive } from "@notra/geo-core/geo/model-live";
import { geoSearchConsoleLive } from "@notra/geo-core/geo/search-console-live";
import { Effect, Layer } from "effect";

import { resolveZdrEntitlement } from "@/lib/billing/subscription";
import { addActiveGeneration, generateRunId } from "@/lib/generations/tracking";
import { resolveGeoFlagState } from "@/lib/geo/flag";

const workflowLayer = Layer.succeed(GeoWorkflowService, {
  // Lazy imports keep the workflow modules from closing a module cycle through
  // their GEO step implementations.
  startGeoScanRun: Effect.fn("GeoDashboardWorkflow.startGeoScanRun")(
    (payload) =>
      Effect.tryPromise({
        try: async () =>
          (await import("@/lib/workflows/start")).startGeoScanRun(payload),
        catch: (cause) => cause,
      })
  ),
  startGeoWriterRun: Effect.fn("GeoDashboardWorkflow.startGeoWriterRun")(
    (payload) =>
      Effect.tryPromise({
        try: async () =>
          (await import("@/lib/workflows/start")).startGeoWriterRun(payload),
        catch: (cause) => cause,
      })
  ),
  startAgentReadinessRun: Effect.fn(
    "GeoDashboardWorkflow.startAgentReadinessRun"
  )((payload) =>
    Effect.tryPromise({
      try: async () =>
        (await import("@/lib/workflows/start")).startAgentReadinessRun(payload),
      catch: (cause) => cause,
    })
  ),
});

const billingLayer = Layer.succeed(GeoContentBillingService, {
  gateContentBilling: Effect.fn("GeoDashboardBilling.gate")((input) =>
    Effect.tryPromise({
      try: async () =>
        (
          await import("@/workflows/steps/content-generation-steps")
        ).gateContentBilling(input),
      catch: (cause) => cause,
    })
  ),
  finalizeContentBilling: Effect.fn("GeoDashboardBilling.finalize")((input) =>
    Effect.tryPromise({
      try: async () =>
        (
          await import("@/workflows/steps/content-generation-steps")
        ).finalizeContentBilling(input),
      catch: (cause) => cause,
    })
  ),
});

const entitlementLayer = Layer.succeed(GeoEntitlementService, {
  resolveZdrEntitlement: Effect.fn("GeoDashboardEntitlement.resolveZdr")(
    (organizationId) =>
      Effect.promise(() => resolveZdrEntitlement(organizationId))
  ),
});

const featureFlagLayer = Layer.succeed(GeoFeatureFlagService, {
  isCursorEngineEnabledForOrganization: Effect.fn(
    "GeoDashboardFeatureFlags.isCursorEnabled"
  )((organizationId) =>
    resolveGeoFlagState(GEO_CURSOR_FLAG_KEY, organizationId).pipe(
      Effect.map((state) => state === "enabled")
    )
  ),
  isOpenCodeEngineEnabledForOrganization: Effect.fn(
    "GeoDashboardFeatureFlags.isOpenCodeEnabled"
  )((organizationId) =>
    resolveGeoFlagState(GEO_OPENCODE_FLAG_KEY, organizationId).pipe(
      Effect.map((state) => state === "enabled")
    )
  ),
});

const generationLayer = Layer.succeed(GeoGenerationService, {
  addActiveGeneration: Effect.fn("GeoDashboardGeneration.addActive")(
    (organizationId, generation) =>
      Effect.tryPromise({
        try: () => addActiveGeneration(organizationId, generation),
        catch: (cause) => cause,
      })
  ),
  generateRunId: Effect.fn("GeoDashboardGeneration.generateRunId")(
    (triggerId) => Effect.sync(() => generateRunId(triggerId))
  ),
});

/** Complete dashboard runtime for GEO programs. */
export const geoCoreDashboardLayer = Layer.mergeAll(
  agentReadinessNetworkLive,
  geoModelLive,
  geoSearchConsoleLive,
  workflowLayer,
  billingLayer,
  entitlementLayer,
  featureFlagLayer,
  generationLayer
);
