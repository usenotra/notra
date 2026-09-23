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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { useMemo } from "react";

import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import type {
  PromptSuggestionSheetProps,
  SuggestionQueryTableProps,
} from "@/types/components/geo";
import { formatCount, formatPercent } from "@/utils/format";
import { suggestionKeywordTotals } from "@/utils/geo-prompt-suggestions";

function SuggestionQueryTable({ queries }: SuggestionQueryTableProps) {
  const rows = queries.toSorted(
    (left, right) => right.impressions - left.impressions
  );

  return (
    <section className="bg-background min-w-0 overflow-hidden rounded-xl border">
      <div className="bg-muted/70 flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="text-sm font-medium">Search queries</h3>
        <span className="text-muted-foreground text-xs tabular-nums">
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground p-4 text-sm">
          No query-level data for this prompt.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Query</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">Position</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((query) => (
              <TableRow key={query.query}>
                <TableCell className="whitespace-normal">
                  <span className="block leading-relaxed wrap-anywhere">
                    {query.query}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {formatCount(query.impressions)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCount(query.clicks)}
                </TableCell>
                <TableCell className="text-right">
                  #{query.position.toFixed(1)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
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
