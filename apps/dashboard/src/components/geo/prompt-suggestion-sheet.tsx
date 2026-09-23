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
import { useMemo } from "react";

import { Table } from "@/components/motion/table";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import type {
  PromptSuggestionSheetProps,
  SuggestionQueryTableProps,
} from "@/types/components/geo";
import { formatCount, formatPercent } from "@/utils/format";
import { suggestionKeywordTotals } from "@/utils/geo-prompt-suggestions";
import { tableHeightFor } from "@/utils/table";

function SuggestionQueryTable({ queries }: SuggestionQueryTableProps) {
  return (
    <section className="min-w-0 space-y-2">
      <h3 className="text-sm font-medium">Search queries</h3>
      <Table
        className="rounded-2xl"
        columns={[
          {
            key: "query",
            header: "Query",
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
            header: "Impressions",
            width: "8.5rem",
            align: "right",
            sortable: true,
            cell: (query) => formatCount(query.impressions),
          },
          {
            key: "clicks",
            header: "Clicks",
            width: "6rem",
            align: "right",
            sortable: true,
            cell: (query) => formatCount(query.clicks),
          },
          {
            key: "position",
            header: "Position",
            width: "6.5rem",
            align: "right",
            sortable: true,
            cell: (query) => `#${query.position.toFixed(1)}`,
          },
        ]}
        data={queries}
        defaultSort={{ key: "impressions", direction: "desc" }}
        emptyState="No query-level data for this prompt."
        getRowId={(query) => query.query}
        height={tableHeightFor(queries.length)}
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
          <SheetDescription>Suggested prompt</SheetDescription>
          <SheetTitle className="leading-snug text-balance wrap-anywhere">
            {detail?.prompt ?? "Suggested prompt"}
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
                  <h3 className="text-sm font-medium">Search performance</h3>
                </div>
                <dl className="grid grid-cols-2 gap-5 p-4 sm:grid-cols-4">
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">
                      Impressions
                    </dt>
                    <dd className="text-xl font-medium tabular-nums">
                      {formatCount(totals.impressions)}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">Clicks</dt>
                    <dd className="text-xl font-medium tabular-nums">
                      {formatCount(totals.clicks)}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">
                      Click-through rate
                    </dt>
                    <dd className="text-xl font-medium tabular-nums">
                      {totals.ctr === null
                        ? "—"
                        : `${formatPercent(totals.ctr)}%`}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">
                      Best position
                    </dt>
                    <dd className="text-xl font-medium tabular-nums">
                      {totals.position === null
                        ? "—"
                        : `#${totals.position.toFixed(1)}`}
                    </dd>
                  </div>
                </dl>
                <p className="text-muted-foreground px-4 pb-4 text-xs">
                  Across the last {GSC_SYNC_LOOKBACK_DAYS} days of Google Search
                  queries that informed this prompt.
                </p>
              </section>

              {title ? (
                <section className="bg-background min-w-0 overflow-hidden rounded-xl border">
                  <div className="bg-muted/70 border-b px-4 py-3">
                    <h3 className="text-sm font-medium">Suggested title</h3>
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
