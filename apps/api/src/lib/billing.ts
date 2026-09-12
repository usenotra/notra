import { FEATURES, PAID_OR_LEGACY_PLAN_IDS } from "@notra/ai/billing/features";
import { Autumn } from "autumn-js";
import { Context, Effect, Layer } from "effect";

import { AI_CREDITS_FEATURE_ID } from "../constants/billing";
import { GeoBillingError, SubscriptionBillingError } from "../errors/billing";
import type {
  GeoEntitlementCheckInput,
  SubscriptionAccessInput,
} from "../types/billing";

export interface BillingOperations {
  readonly checkSubscriptionAccess: (
    input: SubscriptionAccessInput
  ) => Effect.Effect<boolean, SubscriptionBillingError>;
  readonly checkGeoEntitlement: (
    input: GeoEntitlementCheckInput
  ) => Effect.Effect<boolean, GeoBillingError>;
}

export class BillingService extends Context.Service<
  BillingService,
  BillingOperations
>()("api/Billing") {}

export interface BillingMiddlewareOptions {
  billingLayer?: Layer.Layer<BillingService>;
}

export function billingLayer(secretKey: string) {
  const autumn = new Autumn({ secretKey });

  return Layer.succeed(
    BillingService,
    BillingService.of({
      checkSubscriptionAccess: Effect.fn("Billing.checkSubscriptionAccess")(
        function* (input: SubscriptionAccessInput) {
          const customer = yield* Effect.tryPromise({
            try: () =>
              autumn.customers.getOrCreate({
                customerId: input.organizationId,
              }),
            catch: (cause) => new SubscriptionBillingError({ cause }),
          });

          const hasPaidPlan = customer.subscriptions.some(
            (subscription) =>
              !subscription.addOn &&
              subscription.status === "active" &&
              PAID_OR_LEGACY_PLAN_IDS.has(subscription.planId)
          );

          if (hasPaidPlan) {
            return true;
          }

          return yield* Effect.tryPromise({
            try: async () => {
              const check = await autumn.check({
                customerId: input.organizationId,
                featureId: AI_CREDITS_FEATURE_ID,
                requiredBalance: 1,
              });
              return check.allowed === true;
            },
            catch: (cause) => new SubscriptionBillingError({ cause }),
          });
        }
      ),
      checkGeoEntitlement: Effect.fn("Billing.checkGeoEntitlement")(function* (
        input: GeoEntitlementCheckInput
      ) {
        return yield* Effect.tryPromise({
          try: async () => {
            const data = await autumn.check({
              customerId: input.organizationId,
              featureId: FEATURES.AI_ANSWERS,
            });
            return data.balance != null;
          },
          catch: (cause) => new GeoBillingError({ cause }),
        });
      }),
    })
  );
}
