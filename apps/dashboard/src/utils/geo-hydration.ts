import {
  GEO_DEFAULT_RANGE,
  GEO_DEFAULT_TAB,
} from "@notra/geo-core/constants/geo";

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

export function geoRequestedProjectId(
  search: Record<string, string | string[] | undefined>
): string | undefined {
  return firstSearchParam(search.project);
}

/**
 * `projectId` is the server-resolved project (see `resolveInitialGeoProjectId`),
 * which is what the client scope will use on its first render — the raw search
 * param alone would miss the cookie/oldest-project fallback and produce keys the
 * client never reads.
 */
export function geoHydrationInputs(
  organizationId: string,
  projectId: string | undefined,
  search: Record<string, string | string[] | undefined>
) {
  const scope = { organizationId, projectId };
  const { range } = parseGeoRangeParam(
    firstSearchParam(search.range) ?? GEO_DEFAULT_RANGE
  );
  const activeTab = firstSearchParam(search.tab) ?? GEO_DEFAULT_TAB;
  const windowed = geoOverviewQueryInput(scope, {
    from: range.dateFrom,
    to: range.dateTo,
  });

  return {
    activeTab,
    settings: geoSettingsQueryInput(scope),
    overview: windowed,
    // Same shape as `overview`; kept separate so the query keys stay explicit.
    timeseries: windowed,
    promptResultSummaries: windowed,
    competitorShare: windowed,
    languageShare: windowed,
    prompts: geoSettingsQueryInput(scope),
    competitors: geoSettingsQueryInput(scope),
  };
}
