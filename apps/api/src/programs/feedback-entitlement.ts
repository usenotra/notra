import { Effect } from "effect";

import { BillingService } from "../lib/billing";
import type { FeedbackEntitlementCheckInput } from "../types/billing";

export const checkFeedbackEntitlement = Effect.fn(
  "billing.checkFeedbackEntitlement"
)(function* (input: FeedbackEntitlementCheckInput) {
  const billing = yield* BillingService;
  return yield* billing.checkFeedbackEntitlement(input);
});
