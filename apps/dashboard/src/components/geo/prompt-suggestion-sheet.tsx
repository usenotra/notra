"use client";

import { GSC_SYNC_LOOKBACK_DAYS } from "@notra/geo-core/constants/google-search-console";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetScrollArea,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { Table } from "@/components/motion/table";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import type {
  PromptSuggestionSheetProps,
  SuggestionQueryTableProps,
} from "@/types/components/geo";
import { formatCount, formatOneDecimal, formatPercent } from "@/utils/format";
import { suggestionKeywordTotals } from "@/utils/geo-prompt-suggestions";
import { contentTableHeightFor, tableHeightFor } from "@/utils/table";

function SuggestionQueryTable({ queries }: SuggestionQueryTableProps) {
  const t = useTranslations("geo.promptSuggestionSheet");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  return (
    <section className="min-w-0 space-y-2">
      <h3 className="text-sm font-medium">{tGeoShared("searchQueries")}</h3>
      <Table
        className="rounded-2xl"
        columns={[
          {
            key: "query",
            header: tCommon("labels.query"),
            width: "1fr",
            minWidth: "10rem",
            sortable: true,
            cell: (query) => (
              <span className="block leading-relaxed wrap-anywhere">
                {query.query}
              </span>
            ),
          },
          {
            key: "impressions",
            header: tCommon("labels.impressions"),
            width: "8.5rem",
            align: "right",
            sortable: true,
            cell: (query) => formatCount(query.impressions, locale),
          },
          {
            key: "clicks",
            header: tCommon("labels.clicks"),
            width: "6rem",
            align: "right",
            sortable: true,
            cell: (query) => formatCount(query.clicks, locale),
          },
          {
            key: "position",
            header: tCommon("labels.position"),
            width: "6.5rem",
            align: "right",
            sortable: true,
            cell: (query) => `#${formatOneDecimal(query.position, locale)}`,
          },
        ]}
        data={[...queries]}
        defaultSort={{ key: "impressions", direction: "desc" }}
        emptyState={t("noQueryData")}
        getRowId={(query) => query.query}
        height={
          queries.length > 0
            ? contentTableHeightFor(queries.length)
            : tableHeightFor(0)
        }
        rowSizing="content"
      />
    </section>
  );
}

export function PromptSuggestionSheet({
  suggestion,
  actions,
  onOpenChange,
}: PromptSuggestionSheetProps) {
  const t = useTranslations("geo.promptSuggestionSheet");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const payload = useMemo(
    () => (suggestion ? { suggestion, actions } : null),
    [suggestion, actions]
  );
  const [retained, releasePayload] = useRetainedValue(payload);
  const detail = retained?.suggestion;
  const totals = detail ? suggestionKeywordTotals(detail.keywords) : null;
  const title =
    detail?.title && detail.title !== detail.prompt ? detail.title : null;

  return (
    <Sheet
      onOpenChange={onOpenChange}
      onOpenChangeComplete={releasePayload}
      open={suggestion !== null}
    >
      <SheetContent
        className="data-[side=right]:w-[calc(100%-1rem)]"
        side="right"
        variant="inset"
      >
        <SheetHeader className="bg-muted/50 shrink-0 gap-1.5 border-b pr-14">
          <SheetDescription>{t("suggestedPrompt")}</SheetDescription>
          <SheetTitle className="leading-snug text-balance wrap-anywhere">
            {detail?.prompt ?? t("suggestedPrompt")}
          </SheetTitle>
        </SheetHeader>

        {detail && totals ? (
          <SheetScrollArea
            className="bg-muted/20 min-h-full p-4 sm:px-4"
            key={detail.id}
          >
            <div className="space-y-4">
              <section className="bg-background min-w-0 overflow-hidden rounded-xl border">
                <div className="bg-muted/70 border-b px-4 py-3">
                  <h3 className="text-sm font-medium">
                    {tGeoShared("searchPerformance")}
                  </h3>
                </div>
                <dl className="grid grid-cols-2 gap-5 p-4 sm:grid-cols-4">
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">
                      {tCommon("labels.impressions")}
                    </dt>
                    <dd className="text-xl font-medium tabular-nums">
                      {formatCount(totals.impressions, locale)}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">
                      {tCommon("labels.clicks")}
                    </dt>
                    <dd className="text-xl font-medium tabular-nums">
                      {formatCount(totals.clicks, locale)}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">
                      {tGeoShared("clickThroughRate")}
                    </dt>
                    <dd className="text-xl font-medium tabular-nums">
                      {totals.ctr === null
                        ? "—"
                        : `${formatPercent(totals.ctr, locale)}%`}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">
                      {tGeoShared("bestPosition")}
                    </dt>
                    <dd className="text-xl font-medium tabular-nums">
                      {totals.position === null
                        ? "—"
                        : `#${formatOneDecimal(totals.position, locale)}`}
                    </dd>
                  </div>
                </dl>
                <p className="text-muted-foreground px-4 pb-4 text-xs">
                  {t("lookback", { days: GSC_SYNC_LOOKBACK_DAYS })}
                </p>
              </section>

              {title ? (
                <section className="bg-background min-w-0 overflow-hidden rounded-xl border">
                  <div className="bg-muted/70 border-b px-4 py-3">
                    <h3 className="text-sm font-medium">
                      {tGeoShared("suggestedTitle")}
                    </h3>
                  </div>
                  <p className="p-4 text-sm leading-relaxed wrap-anywhere">
                    {title}
                  </p>
                </section>
              ) : null}

              <SuggestionQueryTable queries={detail.keywords} />
            </div>
          </SheetScrollArea>
        ) : null}

        {retained?.actions ? (
          <SheetFooter className="shrink-0 flex-row flex-wrap justify-end border-t">
            {retained.actions}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
