import "@/workflows/runtime";
import { refreshGeoContentGaps } from "@notra/geo-core/geo/gaps";
import type { GeoScopeInput } from "@notra/geo-core/types/geo";
import { Effect } from "effect";

import { geoCoreDashboardLayer } from "@/lib/geo/configure";

export async function refreshGeoContentGapsStep(input: GeoScopeInput) {
  "use step";
  await Effect.runPromise(
    refreshGeoContentGaps(input).pipe(Effect.provide(geoCoreDashboardLayer))
  );
}
