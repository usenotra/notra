"use client";

import {
  GEO_JOURNEY_RECENT_LIMIT,
  GEO_SPARKLINE_MIN_POINTS,
} from "@notra/geo-core/constants/geo";
import type { GeoJourney } from "@notra/geo-core/types/geo";
import {
  formatAiTrafficTimestamp,
  formatGeoSource,
} from "@notra/geo-core/utils/ai-traffic";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useMemo } from "react";

import { DailyTrendChart } from "@/components/geo/daily-trend-chart";
import { EngineIcon } from "@/components/geo/engine-icon";
import { JourneyPathSummary } from "@/components/geo/journey-path-summary";
import { SheetStatGrid } from "@/components/geo/sheet-stat-grid";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import type {
  GeoJourneyPathRow,
  GeoJourneySourceRow,
  JourneyGroupBreakdownProps,
  JourneyGroupContentProps,
  JourneyGroupHeadingProps,
  JourneyGroupSectionTitleProps,
  JourneyGroupSheetProps,
} from "@/types/geo";
import {
  buildJourneyOverview,
  journeyGroupSheetStats,
  journeySeries,
  journeysForGroup,
  journeyTotals,
} from "@/utils/geo-journey";
import { tableHeightFor } from "@/utils/table";

const GROUP_TABLE_MAX_ROWS = 6;

const PAGE_COLUMNS: TableColumn<GeoJourneyPathRow>[] = [
  {
    key: "path",
    header: "Page",
    width: "1fr",
    cell: (row) => (
      <TruncateWithTooltip className="font-mono text-xs">
        {row.path}
      </TruncateWithTooltip>
    ),
  },
  {
    key: "journeys",
    header: "Journeys",
    width: "7rem",
    align: "right",
    cell: (row) => (
      <span className="text-sm tabular-nums">
        {row.journeys.toLocaleString()}
      </span>
    ),
  },
];

const SOURCE_COLUMNS: TableColumn<GeoJourneySourceRow>[] = [
  {
    key: "source",
    header: "Source",
    width: "1fr",
    cell: (row) => (
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <EngineIcon engine={row.source} />
        <span className="truncate">{formatGeoSource(row.source)}</span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {row.visitorType === "crawler" ? "Crawler" : "AI referral"}
        </span>
      </span>
    ),
  },
  {
    key: "journeys",
    header: "Journeys",
    width: "7rem",
    align: "right",
    cell: (row) => (
      <span className="text-sm tabular-nums">
        {row.journeys.toLocaleString()}
      </span>
    ),
  },
];

function SectionTitle({ title, meta }: JourneyGroupSectionTitleProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {meta ? <p className="text-muted-foreground text-xs">{meta}</p> : null}
    </div>
  );
}

function journeyColumns(showSource: boolean): TableColumn<GeoJourney>[] {
  const columns: TableColumn<GeoJourney>[] = [];
  if (showSource) {
    columns.push({
      key: "source",
      header: "Source",
      width: "1fr",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <EngineIcon engine={row.source} />
          <span className="truncate">{formatGeoSource(row.source)}</span>
        </span>
      ),
    });
  } else {
    columns.push({
      key: "entryPath",
      header: "Path",
      width: "1fr",
      cell: (row) => (
        <JourneyPathSummary
          distinctPaths={row.distinctPaths}
          entryPath={row.entryPath}
          paths={row.samplePaths}
        />
      ),
    });
  }
  columns.push(
    {
      key: "pages",
      header: "Pages",
      width: "5.5rem",
      align: "right",
      cell: (row) => (
        <span className="text-sm tabular-nums">
          {row.pages.toLocaleString()}
        </span>
      ),
    },
    {
      key: "lastSeenAt",
      header: "Last seen",
      width: "9.5rem",
      cell: (row) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
          {formatAiTrafficTimestamp(row.lastSeenAt)}
        </span>
      ),
    }
  );
  return columns;
}

function JourneyGroupHeading({
  selection,
  lastSeen,
}: JourneyGroupHeadingProps) {
  return (
    <SheetHeader className="bg-muted/50 shrink-0 gap-1.5 border-b pr-14">
      <SheetTitle className="flex min-w-0 items-center gap-2 text-base leading-snug">
        {selection.kind === "source" ? (
          <>
            <EngineIcon className="size-4" engine={selection.source} />
            <span className="min-w-0 truncate">
              {formatGeoSource(selection.source)}
            </span>
            <Badge variant="secondary">
              {selection.visitorType === "crawler" ? "Crawler" : "AI referral"}
            </Badge>
          </>
        ) : (
          <span className="min-w-0 truncate font-mono text-sm">
            {selection.path}
          </span>
        )}
      </SheetTitle>
      <SheetDescription className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          {lastSeen
            ? `Last seen ${formatAiTrafficTimestamp(lastSeen)}`
            : "No journeys in this range"}
        </span>
      </SheetDescription>
    </SheetHeader>
  );
}

function JourneyGroupBreakdown({
  isSource,
  sampleMeta,
  overview,
}: JourneyGroupBreakdownProps) {
  if (isSource) {
    return (
      <section className="space-y-3">
        <SectionTitle meta={sampleMeta} title="Pages fetched" />
        <Table
          className="rounded-2xl"
          columns={PAGE_COLUMNS}
          data={overview.paths}
          getRowId={(row) => row.path}
          height={tableHeightFor(
            Math.min(overview.paths.length, GROUP_TABLE_MAX_ROWS)
          )}
          rowHeight={TABLE_ROW_HEIGHT}
        />
      </section>
    );
  }
  return (
    <section className="space-y-3">
      <SectionTitle meta={sampleMeta} title="Sources" />
      <Table
        className="rounded-2xl"
        columns={SOURCE_COLUMNS}
        data={overview.sources}
        getRowId={(row) => `${row.source}-${row.visitorType}`}
        height={tableHeightFor(
          Math.min(overview.sources.length, GROUP_TABLE_MAX_ROWS)
        )}
        rowHeight={TABLE_ROW_HEIGHT}
      />
    </section>
  );
}

function JourneyGroupContent({
  selection,
  journeys: allJourneys,
  stats: journeyStats,
  days,
  onOpenJourney,
  onPrefetchJourney,
}: JourneyGroupContentProps) {
  const journeys = useMemo(
    () => journeysForGroup(allJourneys, selection),
    [allJourneys, selection]
  );
  const overview = useMemo(() => buildJourneyOverview(journeys), [journeys]);
  const isSource = selection.kind === "source";
  const sourceRow =
    selection.kind === "source"
      ? journeyStats?.sources.find(
          (row) =>
            row.source === selection.source &&
            row.visitorType === selection.visitorType
        )
      : undefined;
  const pageRow =
    selection.kind === "page"
      ? journeyStats?.pages.find((row) => row.path === selection.path)
      : undefined;
  const row = sourceRow ?? pageRow;
  const totalJourneys = journeyTotals(journeyStats?.sources ?? []).journeys;
  const lastSeen = row?.lastSeenAt ?? journeys[0]?.lastSeenAt;
  const trend = useMemo(
    () => (row ? journeySeries(row.daily, days) : []),
    [days, row]
  );
  const sampled = allJourneys.length >= GEO_JOURNEY_RECENT_LIMIT;
  const sampleMeta = sampled
    ? `From the latest ${allJourneys.length.toLocaleString()} journeys`
    : undefined;
  const stats = journeyGroupSheetStats({
    sourceRow,
    pageRow,
    totalJourneys,
  });

  return (
    <>
      <JourneyGroupHeading lastSeen={lastSeen} selection={selection} />

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
        <SheetStatGrid stats={stats} />

        {trend.length >= GEO_SPARKLINE_MIN_POINTS ? (
          <section className="space-y-3">
            <SectionTitle title="Journeys per day" />
            <DailyTrendChart label="Journeys" points={trend} />
          </section>
        ) : null}

        <JourneyGroupBreakdown
          isSource={isSource}
          overview={overview}
          sampleMeta={sampleMeta}
        />

        <section className="space-y-3">
          <SectionTitle meta={sampleMeta} title="Recent journeys" />
          <Table
            className="rounded-2xl"
            columns={journeyColumns(!isSource)}
            data={journeys}
            emptyState="No journeys in this range"
            getRowId={(row) => row.journeyId}
            height={tableHeightFor(
              Math.min(journeys.length, GROUP_TABLE_MAX_ROWS)
            )}
            onRowClick={onOpenJourney}
            onRowPointerEnter={onPrefetchJourney}
            rowHeight={TABLE_ROW_HEIGHT}
          />
        </section>
      </div>
    </>
  );
}

export function JourneyGroupSheet({
  selection: selectionProp,
  journeys,
  stats,
  days,
  onOpenChange,
  onOpenJourney,
  onPrefetchJourney,
}: JourneyGroupSheetProps) {
  const [selection, releaseSelection] = useRetainedValue(selectionProp);

  return (
    <Sheet
      onOpenChange={onOpenChange}
      onOpenChangeComplete={releaseSelection}
      open={selectionProp !== null}
    >
      <SheetContent className="gap-0 overflow-hidden rounded-2xl data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-[calc(100%-1rem)] data-[side=right]:border data-[side=right]:sm:max-w-2xl">
        {selection ? (
          <JourneyGroupContent
            days={days}
            journeys={journeys}
            stats={stats}
            onOpenJourney={onOpenJourney}
            onPrefetchJourney={onPrefetchJourney}
            selection={selection}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
