import { GEO_BRAND_SEARCH_MIN_QUERY_LENGTH } from "@notra/geo-core/constants/geo";
import {
  competitorKey,
  normalizeCompetitorDomain,
} from "@notra/geo-core/geo/domain";
import type { GeoCompetitor } from "@notra/geo-core/types/geo";

import type {
  CompetitorSearchItemsInput,
  CompetitorSearchResult,
} from "@/types/onboarding";

export function findCompetitor(
  competitors: readonly GeoCompetitor[],
  domain: string | null,
  name: string
): GeoCompetitor | undefined {
  const key = competitorKey(name);
  const normalizedDomain = domain ? normalizeCompetitorDomain(domain) : null;
  return competitors.find((entry) => {
    const entryDomain = entry.domain
      ? normalizeCompetitorDomain(entry.domain)
      : null;
    return normalizedDomain && entryDomain
      ? entryDomain === normalizedDomain
      : competitorKey(entry.name) === key;
  });
}

export function createCompetitor(
  name: string,
  domain: string | null
): GeoCompetitor {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    domain,
    synonyms: [],
    kind: "direct",
    color: null,
  };
}

export function competitorSearchItems({
  ownDomain,
  query,
  searchResults,
  searching,
  selected,
}: CompetitorSearchItemsInput): CompetitorSearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length < GEO_BRAND_SEARCH_MIN_QUERY_LENGTH) {
    return [];
  }

  const normalizedOwnDomain = ownDomain
    ? normalizeCompetitorDomain(ownDomain)
    : null;
  const results: CompetitorSearchResult[] = searchResults.flatMap((entry) =>
    normalizeCompetitorDomain(entry.domain) !== normalizedOwnDomain &&
    !findCompetitor(selected, entry.domain, entry.name)
      ? [{ ...entry, source: "search" }]
      : []
  );
  const normalizedQuery = competitorKey(trimmed);
  const normalizedQueryDomain = normalizeCompetitorDomain(trimmed);
  const hasExactResult = results.some(
    (entry) =>
      competitorKey(entry.name) === normalizedQuery ||
      normalizeCompetitorDomain(entry.domain ?? "") === normalizedQueryDomain
  );
  const matchesSelectedDomain = selected.some(
    (entry) =>
      normalizedQueryDomain !== null &&
      entry.domain !== null &&
      normalizeCompetitorDomain(entry.domain) === normalizedQueryDomain
  );
  const canAddManually =
    !searching &&
    !hasExactResult &&
    normalizedQueryDomain !== normalizedOwnDomain &&
    !matchesSelectedDomain &&
    !findCompetitor(selected, null, trimmed);

  return canAddManually
    ? [
        ...results,
        {
          domain: null,
          logo: null,
          name: trimmed,
          source: "manual",
        },
      ]
    : results;
}
