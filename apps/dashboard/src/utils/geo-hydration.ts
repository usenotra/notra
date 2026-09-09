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

/**
 * `?project=` with an empty value is the same as no scope at all. Normalising
 * it here keeps the server's repair guard and the client scope in agreement —
 * an empty string is falsy, so an un-normalised "" would silently skip the
 * guard while the client kept `projectId: ""` and missed every hydrated key.
 */
export function geoRequestedProjectId(
  search: Record<string, string | string[] | undefined>
): string | undefined {
  return normalizeGeoProjectId(firstSearchParam(search.project));
}

/**
 * Path for the redirect that repairs an invalid `?project=`: drops the bad id,
 * keeps every other search param and appends the validated project (if any).
 */
export function geoProjectRepairPath(
  slug: string,
  search: Record<string, string | string[] | undefined>,
  projectId: string | undefined
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (key === "project" || value === undefined) {
      continue;
    }
    for (const entry of Array.isArray(value) ? value : [value]) {
      query.append(key, entry);
    }
  }
  if (projectId) {
    query.set("project", projectId);
  }
  const suffix = query.toString();
  return `/${encodeURIComponent(slug)}/geo${suffix ? `?${suffix}` : ""}`;
}

export function normalizeGeoProjectId(
  projectId: string | null | undefined
): string | undefined {
  const trimmed = projectId?.trim();
  return trimmed ? trimmed : undefined;
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
  const activeTab = toGeoTab(firstSearchParam(search.tab) ?? GEO_DEFAULT_TAB);
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
    trafficJourneys: windowed,
    prompts: geoSettingsQueryInput(scope),
    competitors: geoSettingsQueryInput(scope),
  };
}
