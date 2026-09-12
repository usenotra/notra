import { Effect } from "effect";

import { BillingService } from "../lib/billing";
import type { SubscriptionAccessInput } from "../types/billing";

export const checkSubscriptionAccess = Effect.fn(
  "billing.checkSubscriptionAccess"
)(function* (input: SubscriptionAccessInput) {
  const billing = yield* BillingService;
  return yield* billing.checkSubscriptionAccess(input);
});
