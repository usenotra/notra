"use client";

import { GEO_BRAND_SEARCH_MAX_QUERY_LENGTH } from "@notra/geo-core/constants/geo";
import { Combobox, ComboboxInput } from "@notra/ui/components/ui/combobox";
import { Loader2Icon } from "lucide-react";

import { CompetitorSearchContent } from "@/components/onboarding/competitor-search-content";
import { useCompetitorSearchState } from "@/lib/hooks/use-competitor-search-state";
import type {
  CompetitorSearchProps,
  CompetitorSearchResult,
} from "@/types/onboarding";

export function CompetitorSearch({
  organizationId,
  ownDomain,
  selected,
  disabled,
  onAdd,
}: CompetitorSearchProps) {
  const search = useCompetitorSearchState({
    organizationId,
    ownDomain,
    selected,
  });

  return (
    <Combobox<CompetitorSearchResult | null>
      disabled={disabled}
      filter={null}
      inputValue={search.query}
      items={search.items}
      itemToStringLabel={(item) => item?.name ?? ""}
      onInputValueChange={search.setQuery}
      onValueChange={(item) => {
        if (item) {
          onAdd(item);
        }
        search.setQuery("");
      }}
      value={null}
    >
      <ComboboxInput
        aria-label="Search brands"
        className="h-11 rounded-xl"
        maxLength={GEO_BRAND_SEARCH_MAX_QUERY_LENGTH}
        placeholder="Type a name or domain"
        showTrigger={false}
      >
        {search.searching ? (
          <span className="text-muted-foreground flex items-center pr-3">
            <Loader2Icon className="size-4 animate-spin" />
          </span>
        ) : null}
      </ComboboxInput>
      {search.active ? (
        <CompetitorSearchContent
          items={search.items}
          onRetry={search.retry}
          searchError={search.searchError}
          searchFetching={search.searchFetching}
          searching={search.searching}
        />
      ) : null}
    </Combobox>
  );
}
