import { GEO_BRAND_SEARCH_MIN_QUERY_LENGTH } from "@notra/geo-core/constants/geo";
import { competitorKey } from "@notra/geo-core/geo/domain";
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
  return competitors.find((entry) =>
    domain && entry.domain
      ? entry.domain === domain
      : competitorKey(entry.name) === key
  );
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

  const results: CompetitorSearchResult[] = searchResults.flatMap((entry) =>
    entry.domain !== ownDomain &&
    !findCompetitor(selected, entry.domain, entry.name)
      ? [{ ...entry, source: "search" }]
      : []
  );
  const normalizedQuery = trimmed.toLowerCase();
  const hasExactResult = results.some(
    (entry) =>
      entry.name.toLowerCase() === normalizedQuery ||
      entry.domain?.toLowerCase() === normalizedQuery
  );
  const canAddManually =
    !searching &&
    !hasExactResult &&
    normalizedQuery !== ownDomain?.toLowerCase() &&
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
