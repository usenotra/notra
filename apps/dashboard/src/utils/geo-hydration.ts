import { GEO_DEFAULT_RANGE } from "@notra/geo-core/constants/geo";

import {
  geoOverviewQueryInput,
  geoSettingsQueryInput,
} from "@/utils/geo-query-input";
import { parseGeoRangeParam } from "@/utils/geo-range";

function firstSearchParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function geoHydrationInputs(
  organizationId: string,
  search: Record<string, string | string[] | undefined>
) {
  const scope = {
    organizationId,
    projectId: firstSearchParam(search.project),
  };
  const { range } = parseGeoRangeParam(
    firstSearchParam(search.range) ?? GEO_DEFAULT_RANGE
  );

  return {
    settings: geoSettingsQueryInput(scope),
    overview: geoOverviewQueryInput(scope, {
      from: range.dateFrom,
      to: range.dateTo,
    }),
  };
}
