"use client";

import {
  GEO_SEARCH_GAP_ACTION_CLASS,
  GEO_SEARCH_GAP_ACTION_LABELS,
} from "@notra/geo-core/constants/geo";
import type {
  GeoContentCollisionMatch,
  GeoSearchGapRow,
  GeoSuggestionKeyword,
} from "@notra/geo-core/types/geo";
import { Badge } from "@notra/ui/components/ui/badge";
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

import { Table, type TableColumn } from "@/components/motion/table";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import type { GeoSearchGapDetailSheetProps } from "@/types/components/geo-gaps";
import { formatCount, formatPercent } from "@/utils/format";

const SEARCH_QUERY_COLUMNS: TableColumn<GeoSuggestionKeyword>[] = [
  {
    key: "query",
    header: "Query",
    width: "1fr",
    minWidth: "10rem",
    sortable: true,
    cell: (query) => (
      <span className="block leading-relaxed wrap-anywhere">{query.query}</span>
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
];

function searchMetrics(gap: GeoSearchGapRow) {
  const ctr =
    gap.impressions !== null && gap.impressions > 0 && gap.clicks !== null
      ? `${formatPercent((gap.clicks / gap.impressions) * 100)}%`
      : "—";
  return [
    [
      "Impressions",
      gap.impressions === null ? "—" : formatCount(gap.impressions),
    ],
    ["Clicks", gap.clicks === null ? "—" : formatCount(gap.clicks)],
    ["Click-through rate", ctr],
    [
      "Avg. position",
      gap.position === null ? "—" : `#${gap.position.toFixed(1)}`,
    ],
  ] as const;
}

function SearchPerformance({ gap }: { gap: GeoSearchGapRow }) {
  return (
    <section className="bg-background min-w-0 overflow-hidden rounded-xl border">
      <div className="bg-muted/70 border-b px-4 py-3">
        <h3 className="text-sm font-medium">Search performance</h3>
      </div>
      <dl className="grid grid-cols-2 gap-5 p-4 sm:grid-cols-4">
        {searchMetrics(gap).map(([label, value]) => (
          <div className="space-y-1" key={label}>
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="text-xl font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground px-4 pb-4 text-xs">
        Across this gap&apos;s Google Search queries.
      </p>
    </section>
  );
}

function SearchRecommendation({ gap }: { gap: GeoSearchGapRow }) {
  const title = gap.brief?.workingTitle ?? gap.title;
  return (
    <section className="bg-background min-w-0 overflow-hidden rounded-xl border">
      <div className="bg-muted/70 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="text-sm font-medium">Recommendation</h3>
        <Badge
          className={GEO_SEARCH_GAP_ACTION_CLASS[gap.recommendation.action]}
          variant="outline"
        >
          {GEO_SEARCH_GAP_ACTION_LABELS[gap.recommendation.action]}
        </Badge>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
          {gap.recommendation.reason}
        </p>
        {title && title !== gap.prompt ? (
          <div className="space-y-1 border-t pt-3">
            <p className="text-muted-foreground text-xs">
              {gap.brief?.workingTitle ? "Draft title" : "Suggested title"}
            </p>
            <p className="text-sm leading-relaxed wrap-anywhere">{title}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SearchQueries({ queries }: { queries: GeoSuggestionKeyword[] }) {
  return (
    <section className="min-w-0">
      <Table
        className="rounded-2xl"
        toolbar={
          <div className="bg-muted/70 flex items-center justify-between gap-3 px-4 py-3">
            <h3 className="text-sm font-medium">Search queries</h3>
            <span className="text-muted-foreground text-xs tabular-nums">
              {queries.length}
            </span>
          </div>
        }
        columns={SEARCH_QUERY_COLUMNS}
        data={queries}
        defaultSort={{ key: "impressions", direction: "desc" }}
        emptyState="No query-level data available for this gap."
        getRowId={(query) => query.query}
        height={360}
        rowSizing="content"
      />
    </section>
  );
}

function RelatedPage({ target }: { target: GeoContentCollisionMatch }) {
  const label = target.kind === "post" ? "Content" : "Website page";
  const title = target.title || target.url || "Untitled content";
  return (
    <li className="min-w-0 space-y-1.5 p-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <span className="text-muted-foreground text-xs tabular-nums">
          · {Math.round(target.score * 100)}% match
        </span>
      </div>
      {target.url ? (
        <a
          className="decoration-border focus-visible:ring-ring block rounded-sm text-sm leading-relaxed wrap-anywhere underline underline-offset-4 hover:decoration-current focus-visible:ring-2"
          href={target.url}
          rel="noopener"
          target="_blank"
          title={title}
        >
          {title}
        </a>
      ) : (
        <p className="text-sm leading-relaxed wrap-anywhere">{title}</p>
      )}
      {target.url && target.title ? (
        <p className="text-muted-foreground text-xs leading-relaxed wrap-anywhere">
          {target.url}
        </p>
      ) : null}
    </li>
  );
}

function RelatedPages({ targets }: { targets: GeoContentCollisionMatch[] }) {
  return (
    <section className="bg-background min-w-0 overflow-hidden rounded-xl border">
      <div className="bg-muted/70 flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="text-sm font-medium">Related pages</h3>
        <span className="text-muted-foreground text-xs tabular-nums">
          {targets.length}
        </span>
      </div>
      {targets.length > 0 ? (
        <ul className="divide-y">
          {targets.map((target) => (
            <RelatedPage key={`${target.kind}:${target.id}`} target={target} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground p-4 text-sm">
          No related page found.
        </p>
      )}
    </section>
  );
}

function SearchGapContent({ gap }: { gap: GeoSearchGapRow }) {
  return (
    <SheetScrollArea
      className="bg-muted/20 min-h-full p-4 sm:px-4"
      key={gap.id}
    >
      <div className="space-y-4">
        <SearchPerformance gap={gap} />
        <SearchRecommendation gap={gap} />
        <SearchQueries queries={gap.queries} />
        <RelatedPages targets={gap.recommendation.targets} />
      </div>
    </SheetScrollArea>
  );
}

export function SearchGapDetailSheet({
  row,
  actions,
  onOpenChange,
}: GeoSearchGapDetailSheetProps) {
  const payload = useMemo(
    () => (row ? { row, actions } : null),
    [row, actions]
  );
  const [retained, releasePayload] = useRetainedValue(payload);
  const gap = retained?.row;

  return (
    <Sheet
      onOpenChange={onOpenChange}
      onOpenChangeComplete={releasePayload}
      open={row !== null}
    >
      <SheetContent
        className="data-[side=right]:w-[calc(100%-1rem)]"
        side="right"
        variant="inset"
      >
        <SheetHeader className="bg-muted/50 shrink-0 gap-1.5 border-b pr-14">
          <SheetDescription>Search gap · Source question</SheetDescription>
          <SheetTitle className="leading-snug text-balance wrap-anywhere">
            {gap?.prompt ?? "Search gap"}
          </SheetTitle>
        </SheetHeader>
        {gap ? <SearchGapContent gap={gap} /> : null}
        {retained?.actions ? (
          <SheetFooter className="shrink-0 flex-row flex-wrap justify-end border-t">
            {retained.actions}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
