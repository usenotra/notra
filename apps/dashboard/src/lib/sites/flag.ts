import { Effect } from "effect";

import { SITES_FLAG_KEY, SITES_FLAG_TIMEOUT_MS } from "@/constants/sites";
import { resolveGeoFlagState } from "@/lib/geo/flag";

export function isSitesEnabledForOrganization(
  organizationId: string
): Promise<boolean> {
  return Effect.runPromise(
    resolveGeoFlagState(SITES_FLAG_KEY, organizationId).pipe(
      Effect.timeout(SITES_FLAG_TIMEOUT_MS),
      Effect.map((state) => state === "enabled")
    )
  ).catch(() => false);
}
