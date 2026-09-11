import { Effect } from "effect";

import { GeoBillingError } from "../errors/billing";
import type {
  GeoEntitlementCheckInput,
  GeoEntitlementChecker,
} from "../types/billing";

export const checkGeoEntitlement = Effect.fn("billing.checkGeoEntitlement")(
  function* (
    input: GeoEntitlementCheckInput,
    checkEntitlement: GeoEntitlementChecker
  ) {
    return yield* Effect.tryPromise({
      try: () => checkEntitlement(input),
      catch: (cause) => new GeoBillingError({ cause }),
    });
  }
);
