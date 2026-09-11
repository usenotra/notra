import { Effect } from "effect";

import { BillingService } from "../lib/billing";
import type { GeoEntitlementCheckInput } from "../types/billing";

export const checkGeoEntitlement = Effect.fn("billing.checkGeoEntitlement")(
  function* (input: GeoEntitlementCheckInput) {
    const billing = yield* BillingService;
    return yield* billing.checkGeoEntitlement(input);
  }
);
