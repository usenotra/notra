"use client";

import {
  GEO_BRAND_SEARCH_DEBOUNCE_MS,
  GEO_BRAND_SEARCH_MIN_QUERY_LENGTH,
} from "@notra/geo-core/constants/geo";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useState } from "react";

import { useGeoBrandSearch } from "@/lib/hooks/use-geo";
import type { UseCompetitorSearchStateInput } from "@/types/onboarding";
import { competitorSearchItems } from "@/utils/onboarding-competitors";

export function useCompetitorSearchState({
  organizationId,
  ownDomain,
  selected,
}: UseCompetitorSearchStateInput) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query, {
    wait: GEO_BRAND_SEARCH_DEBOUNCE_MS,
  });
  const search = useGeoBrandSearch(organizationId, debouncedQuery);
  const active = query.trim().length >= GEO_BRAND_SEARCH_MIN_QUERY_LENGTH;
  const searching = active && (search.isFetching || query !== debouncedQuery);
  // Once the provider has failed, keep the manual fallback available while a
  // user-triggered retry runs so recovery never depends on the provider.
  const retryingFailedQuery = search.isError && query === debouncedQuery;
  const items = competitorSearchItems({
    ownDomain,
    query,
    searchResults: search.data?.results ?? [],
    searching: searching && !retryingFailedQuery,
    selected,
  });

  return {
    active,
    items,
    query,
    retry: () => {
      search.refetch();
    },
    searchError: search.isError,
    searchFetching: search.isFetching,
    searching,
    setQuery,
  };
}
