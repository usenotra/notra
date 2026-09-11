import { PAID_OR_LEGACY_PLAN_IDS } from "@notra/ai/billing/features";
import { Effect } from "effect";

import { SubscriptionBillingError } from "../errors/billing";
import type {
  SubscriptionAccessInput,
  SubscriptionBillingChecker,
} from "../types/billing";

export const checkSubscriptionAccess = Effect.fn(
  "billing.checkSubscriptionAccess"
)(function* (
  input: SubscriptionAccessInput,
  billing: SubscriptionBillingChecker
) {
  const customer = yield* Effect.tryPromise({
    try: () => billing.getCustomer(input),
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
    try: () => billing.checkCredits(input),
    catch: (cause) => new SubscriptionBillingError({ cause }),
  });
});
