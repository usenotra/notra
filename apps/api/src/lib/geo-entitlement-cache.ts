import { Cache, Effect, Exit } from "effect";

import {
  GEO_ENTITLEMENT_CACHE_CAPACITY,
  GEO_ENTITLEMENT_CACHE_TTL,
} from "../constants/billing";
import type { GeoBillingError } from "../errors/billing";

/** One cache per billing credential; never cache denials or provider failures. */
export function makeGeoEntitlementCache(
  lookup: (organizationId: string) => Effect.Effect<boolean, GeoBillingError>
) {
  return Cache.makeWith(lookup, {
    capacity: GEO_ENTITLEMENT_CACHE_CAPACITY,
    timeToLive: (exit) =>
      Exit.isSuccess(exit) && exit.value ? GEO_ENTITLEMENT_CACHE_TTL : 0,
  });
}
