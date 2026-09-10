import type { GeoQueryScope, GeoRangeQuery } from "@/types/geo";
import { toGeoWindowInput } from "@/utils/geo-range";

/**
 * Single source for the GEO query inputs that are both prefetched on the server
 * and requested by the client hooks. The two sides must produce byte-identical
 * inputs or the prefetched cache entry is never read — build them here only.
 */
export function geoSettingsQueryInput(scope: GeoQueryScope) {
  return {
    organizationId: scope.organizationId,
    projectId: scope.projectId,
  };
}

export function geoOverviewQueryInput(
  scope: GeoQueryScope,
  range: GeoRangeQuery | undefined
) {
  return { ...geoSettingsQueryInput(scope), ...toGeoWindowInput(range) };
}
