"use client";

import {
  GEO_BRAND_SEARCH_DEBOUNCE_MS,
  GEO_BRAND_SEARCH_MAX_QUERY_LENGTH,
  GEO_BRAND_SEARCH_MIN_QUERY_LENGTH,
} from "@notra/geo-core/constants/geo";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@notra/ui/components/ui/combobox";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { Loader2Icon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/button";
import { CompetitorBrandLogo } from "@/components/onboarding/competitor-brand-logo";
import { useGeoBrandSearch } from "@/lib/hooks/use-geo";
import type {
  CompetitorSearchProps,
  CompetitorSearchResult,
} from "@/types/onboarding";
import { competitorSearchItems } from "@/utils/onboarding-competitors";

export function CompetitorSearch({
  organizationId,
  ownDomain,
  selected,
  disabled,
  onAdd,
}: CompetitorSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query, {
    wait: GEO_BRAND_SEARCH_DEBOUNCE_MS,
  });
  const search = useGeoBrandSearch(organizationId, debouncedQuery);
  const trimmed = query.trim();
  const active = trimmed.length >= GEO_BRAND_SEARCH_MIN_QUERY_LENGTH;
  const searching = active && (search.isFetching || query !== debouncedQuery);
  const items = competitorSearchItems({
    ownDomain,
    query,
    searchResults: search.data?.results ?? [],
    searching,
    selected,
  });

  return (
    <Combobox<CompetitorSearchResult | null>
      disabled={disabled}
      filter={null}
      inputValue={query}
      items={items}
      itemToStringLabel={(item) => item?.name ?? ""}
      onInputValueChange={(value) => setQuery(value)}
      onValueChange={(item) => {
        if (item) {
          onAdd(item);
        }
        setQuery("");
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
        {searching ? (
          <span className="text-muted-foreground flex items-center pr-3">
            <Loader2Icon className="size-4 animate-spin" />
          </span>
        ) : null}
      </ComboboxInput>
      {active ? (
        <ComboboxContent>
          {search.isError ? (
            <div
              aria-live="polite"
              className="flex items-center justify-between gap-3 border-b px-2.5 py-2"
            >
              <span className="text-muted-foreground text-xs">
                Search unavailable
              </span>
              <Button
                className="h-7 shrink-0 px-2 text-xs"
                disabled={search.isFetching}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  search.refetch();
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <RefreshCwIcon
                  className={
                    search.isFetching ? "size-3 animate-spin" : "size-3"
                  }
                />
                {search.isFetching ? "Retrying" : "Retry search"}
              </Button>
            </div>
          ) : null}
          <ComboboxEmpty>{searching ? "Looking" : "No matches"}</ComboboxEmpty>
          <ComboboxList>
            {items.map((entry) => (
              <ComboboxItem
                key={entry.domain ?? `manual:${entry.name}`}
                value={entry}
              >
                {entry.source === "manual" ? (
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-md">
                      <PlusIcon className="size-3.5" />
                    </span>
                    <span className="truncate font-medium">
                      Add “{entry.name}” manually
                    </span>
                    {search.isError ? (
                      <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                        Search unavailable
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="flex min-w-0 items-center gap-2.5">
                    <CompetitorBrandLogo
                      className="size-6 rounded-md"
                      domain={entry.domain}
                      logo={entry.logo}
                      name={entry.name}
                    />
                    <span className="truncate font-medium">{entry.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {entry.domain}
                    </span>
                  </span>
                )}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      ) : null}
    </Combobox>
  );
}
