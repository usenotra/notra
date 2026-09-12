import {
  allowUnmeteredAiInDevelopment,
  autumn,
} from "@notra/ai/billing/autumn";
import { FEATURES } from "@notra/ai/billing/features";
import {
  GeoEntitlementService,
  GeoFeatureFlagService,
  GeoGenerationService,
  GeoWorkflowService,
} from "@notra/geo-core/deps";
import { agentReadinessNetworkLive } from "@notra/geo-core/geo/agent-readiness-live";
import { geoModelLive } from "@notra/geo-core/geo/model-live";
import { geoSearchConsoleLive } from "@notra/geo-core/geo/search-console-live";
import type { GeoZdrEntitlement } from "@notra/geo-core/types/geo";
import { Redis } from "@upstash/redis";
import { Effect, Layer } from "effect";

import {
  AGENT_READINESS_INTERNAL_WORKFLOW_PATH,
  GEO_SCAN_INTERNAL_WORKFLOW_PATH,
  GEO_WRITER_INTERNAL_WORKFLOW_PATH,
} from "../../constants/geo";
import { addActiveGeneration } from "../../utils/active-generations";
import {
  getInternalWorkflowUrl,
  startDashboardWorkflowEffect,
} from "../../utils/internal-workflow";
import { internalDashboardLive } from "../internal-dashboard";

const redis = Redis.fromEnv();

const workflowLayer = Layer.succeed(GeoWorkflowService, {
  startGeoScanRun: Effect.fn("GeoApiWorkflow.startGeoScanRun")(
    function* (payload) {
      const runId = yield* startDashboardWorkflowEffect(
        getInternalWorkflowUrl(process.env, GEO_SCAN_INTERNAL_WORKFLOW_PATH),
        payload
      ).pipe(Effect.provide(internalDashboardLive));
      return { runId };
    }
  ),
  startGeoWriterRun: Effect.fn("GeoApiWorkflow.startGeoWriterRun")(
    function* (payload) {
      const runId = yield* startDashboardWorkflowEffect(
        getInternalWorkflowUrl(process.env, GEO_WRITER_INTERNAL_WORKFLOW_PATH),
        payload
      ).pipe(Effect.provide(internalDashboardLive));
      return { runId };
    }
  ),
  startAgentReadinessRun: Effect.fn("GeoApiWorkflow.startAgentReadinessRun")(
    function* (payload) {
      const runId = yield* startDashboardWorkflowEffect(
        getInternalWorkflowUrl(
          process.env,
          AGENT_READINESS_INTERNAL_WORKFLOW_PATH
        ),
        payload
      ).pipe(Effect.provide(internalDashboardLive));
      return { runId };
    }
  ),
});

const entitlementLayer = Layer.succeed(GeoEntitlementService, {
  resolveZdrEntitlement: Effect.fn("GeoApiEntitlement.resolveZdr")(
    function* (organizationId) {
      if (allowUnmeteredAiInDevelopment) {
        return "entitled";
      }
      const client = autumn;
      if (!client) {
        return process.env.NODE_ENV === "production"
          ? "not_entitled"
          : "entitled";
      }
      return yield* Effect.promise(async (): Promise<GeoZdrEntitlement> => {
        try {
          const data = await client.check({
            customerId: organizationId,
            featureId: FEATURES.ZDR,
          });
          return data.allowed === true ? "entitled" : "not_entitled";
        } catch {
          return "unknown";
        }
      });
    }
  ),
});

const featureFlagLayer = Layer.succeed(GeoFeatureFlagService, {
  // The API has no feature-flag client. Hidden engines are preserved when
  // settings are saved, so reporting direct engines as disabled cannot remove
  // access.
  isCursorEngineEnabledForOrganization: Effect.fn(
    "GeoApiFeatureFlags.isCursorEnabled"
  )(() => Effect.succeed(false)),
  isOpenCodeEngineEnabledForOrganization: Effect.fn(
    "GeoApiFeatureFlags.isOpenCodeEnabled"
  )(() => Effect.succeed(false)),
});

const generationLayer = Layer.succeed(GeoGenerationService, {
  addActiveGeneration: Effect.fn("GeoApiGeneration.addActive")(
    (organizationId, generation) =>
      Effect.tryPromise({
        try: () => addActiveGeneration(redis, organizationId, generation),
        catch: (cause) => cause,
      })
  ),
  generateRunId: Effect.fn("GeoApiGeneration.generateRunId")((triggerId) =>
    Effect.sync(() => `${triggerId}-${Date.now()}`)
  ),
});

/**
 * Capabilities the public API can truthfully provide to GEO programs.
 *
 * Content billing is deliberately absent. Programs that require it run in the
 * dashboard and are reached through its authenticated internal endpoints.
 */
export const geoCoreApiLayer = Layer.mergeAll(
  agentReadinessNetworkLive,
  geoModelLive,
  geoSearchConsoleLive,
  workflowLayer,
  entitlementLayer,
  featureFlagLayer,
  generationLayer
);
