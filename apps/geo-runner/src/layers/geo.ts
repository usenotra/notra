import {
  allowUnmeteredAiInDevelopment,
  autumn,
} from "@notra/ai/billing/autumn";
import {
  confirmContentBilling,
  releaseContentBilling,
  reserveContentBilling,
} from "@notra/ai/billing/content-billing";
import { FEATURES } from "@notra/ai/billing/features";
import {
  GeoContentBillingService,
  GeoEntitlementService,
  GeoFeatureFlagService,
} from "@notra/geo-core/deps";
import { geoModelLive } from "@notra/geo-core/geo/model-live";
import type { GeoZdrEntitlement } from "@notra/geo-core/types/geo";
import { Effect, Layer } from "effect";

const billingLayer = Layer.succeed(GeoContentBillingService, {
  gateContentBilling: Effect.fn("GeoRunnerBilling.gate")((input) =>
    Effect.tryPromise({
      try: () => reserveContentBilling(input),
      catch: (cause) => cause,
    })
  ),
  finalizeContentBilling: Effect.fn("GeoRunnerBilling.finalize")((input) =>
    Effect.tryPromise({
      try: () =>
        input.action === "release"
          ? releaseContentBilling(input.reservation)
          : confirmContentBilling({
              reservation: input.reservation,
              units: input.units,
              usage: input.usage,
              fallbackModelId: input.fallbackModelId,
              properties: input.properties,
            }),
      catch: (cause) => cause,
    })
  ),
});

const entitlementLayer = Layer.succeed(GeoEntitlementService, {
  resolveZdrEntitlement: Effect.fn("GeoRunnerEntitlement.resolveZdr")(
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
  // The runner has no feature-flag client, so flag-gated engines stay hidden
  // from the catalog it validates against.
  isCursorEngineEnabledForOrganization: Effect.fn(
    "GeoRunnerFeatureFlags.isCursorEnabled"
  )(() => Effect.succeed(false)),
  isOpenCodeEngineEnabledForOrganization: Effect.fn(
    "GeoRunnerFeatureFlags.isOpenCodeEnabled"
  )(() => Effect.succeed(false)),
});

/** Everything a one-off scan needs, with no dashboard or workflow in the path. */
export const geoRunnerLayer = Layer.mergeAll(
  geoModelLive,
  billingLayer,
  entitlementLayer,
  featureFlagLayer
);
