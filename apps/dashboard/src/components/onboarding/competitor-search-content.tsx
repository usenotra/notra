"use client";

import { Add01Icon, Refresh03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from "@notra/ui/components/ui/combobox";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { CompetitorBrandLogo } from "@/components/onboarding/competitor-brand-logo";
import type {
  CompetitorSearchContentProps,
  CompetitorSearchResultRowProps,
  SearchRetryNoticeProps,
} from "@/types/onboarding";

function SearchRetryNotice({
  onRetry,
  searchFetching,
}: SearchRetryNoticeProps) {
  const t = useTranslations("onboarding.competitorSearch");
  return (
    <div
      aria-live="polite"
      className="flex items-center justify-between gap-3 border-b px-2.5 py-2"
    >
      <span className="text-muted-foreground text-xs">{t("unavailable")}</span>
      <Button
        className="h-7 shrink-0 px-2 text-xs"
        loading={searchFetching}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRetry();
        }}
        size="sm"
        type="button"
        variant="ghost"
      >
        <HugeiconsIcon className="size-3" icon={Refresh03Icon} />
        {t("retry")}
      </Button>
    </div>
  );
}

function CompetitorSearchResultRow({
  entry,
  searchUnavailable,
}: CompetitorSearchResultRowProps) {
  const t = useTranslations("onboarding.competitorSearch");
  if (entry.source === "manual") {
    return (
      <span className="flex w-full min-w-0 items-center gap-2.5">
        <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-md">
          <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {t("addManually", { name: entry.name })}
        </span>
        {searchUnavailable ? (
          <span className="text-muted-foreground ml-auto shrink-0 text-xs">
            {t("unavailable")}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className="flex w-full min-w-0 items-center gap-2.5">
      <CompetitorBrandLogo
        className="size-6 rounded-md"
        domain={entry.domain}
        logo={entry.logo}
        name={entry.name}
      />
      <span className="min-w-0 flex-1 truncate font-medium">{entry.name}</span>
      <span className="text-muted-foreground min-w-0 shrink truncate text-xs">
        {entry.domain}
      </span>
    </span>
  );
}

export function CompetitorSearchContent({
  items,
  onRetry,
  searchError,
  searchFetching,
  searching,
}: CompetitorSearchContentProps) {
  const t = useTranslations("onboarding.competitorSearch");
  return (
    <ComboboxContent className="min-w-(--anchor-width)">
      {searchError ? (
        <SearchRetryNotice onRetry={onRetry} searchFetching={searchFetching} />
      ) : null}
      <ComboboxEmpty>{searching ? t("looking") : t("noMatches")}</ComboboxEmpty>
      <ComboboxList>
        {items.map((entry) => (
          <ComboboxItem
            key={entry.domain ?? `manual:${entry.name}`}
            value={entry}
          >
            <CompetitorSearchResultRow
              entry={entry}
              searchUnavailable={searchError}
            />
          </ComboboxItem>
        ))}
      </ComboboxList>
    </ComboboxContent>
  );
}
