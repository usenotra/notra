"use client";

import { GEO_BRAND_SEARCH_MAX_QUERY_LENGTH } from "@notra/geo-core/constants/geo";
import { Combobox, ComboboxInput } from "@notra/ui/components/ui/combobox";
import { Spinner } from "@notra/ui/components/ui/spinner";
import { useTranslations } from "use-intl";

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
  const t = useTranslations("onboarding.competitorSearch");
  const tCommon = useTranslations("common");
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
        aria-label={tCommon("labels.searchBrands")}
        className="h-11 rounded-xl"
        maxLength={GEO_BRAND_SEARCH_MAX_QUERY_LENGTH}
        placeholder={t("placeholder")}
        showTrigger={false}
      >
        {search.searching ? (
          <span className="text-muted-foreground flex items-center pr-3">
            <Spinner />
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
