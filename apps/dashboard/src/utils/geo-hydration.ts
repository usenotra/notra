import {
  GEO_DEFAULT_RANGE,
  GEO_DEFAULT_TAB,
} from "@notra/geo-core/constants/geo";

import {
  geoOverviewQueryInput,
  geoSettingsQueryInput,
} from "@/utils/geo-query-input";
import { parseGeoRangeParam } from "@/utils/geo-range";
import { toGeoTab } from "@/utils/geo-tabs";

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
  const activeTab = toGeoTab(firstSearchParam(search.tab) ?? GEO_DEFAULT_TAB);
  const windowed = geoOverviewQueryInput(scope, {
    from: range.dateFrom,
    to: range.dateTo,
  });

  return {
    activeTab,
    settings: geoSettingsQueryInput(scope),
    overview: windowed,
    timeseries: windowed,
    promptResultSummaries: windowed,
    competitorShare: windowed,
    languageShare: windowed,
    trafficJourneys: windowed,
    prompts: geoSettingsQueryInput(scope),
    competitors: geoSettingsQueryInput(scope),
  };
}
