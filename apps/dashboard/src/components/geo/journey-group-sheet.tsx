"use client";

import {
  GEO_JOURNEY_DEEP_CRAWL_PAGES,
  GEO_JOURNEY_RECENT_LIMIT,
  GEO_SPARKLINE_MIN_POINTS,
  GEO_TRAFFIC_STAT_TREND_HINT,
} from "@notra/geo-core/constants/geo";
import type { GeoJourney } from "@notra/geo-core/types/geo";
import {
  formatAiTrafficTimestamp,
  formatGeoSource,
  trafficVisitDelta,
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
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { JourneyPathSummary } from "@/components/geo/journey-path-summary";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import type {
  GeoJourneyPathRow,
  GeoJourneySourceRow,
  JourneyGroupContentProps,
  JourneyGroupSectionTitleProps,
  JourneyGroupSheetProps,
} from "@/types/geo";
import {
  buildJourneyOverview,
  formatJourneyDepth,
  formatJourneyShare,
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

  const journeyStat = {
    label: "Journeys",
    value: row ? row.journeys.toLocaleString() : "—",
    delta: row ? trafficVisitDelta(row.journeys, row.previousJourneys) : null,
  };
  let stats: { label: string; value: string; delta?: number | null }[];
  if (sourceRow) {
    stats = [
      journeyStat,
      {
        label: "Avg. depth",
        value: formatJourneyDepth(sourceRow.pages, sourceRow.journeys),
      },
      {
        label: `Crawled ${GEO_JOURNEY_DEEP_CRAWL_PAGES}+ pages`,
        value: formatJourneyShare(sourceRow.deepCrawls, sourceRow.journeys),
      },
    ];
  } else if (pageRow) {
    stats = [
      journeyStat,
      {
        label: "Entry page",
        value: formatJourneyShare(pageRow.entries, pageRow.journeys),
      },
      {
        label: "Of all journeys",
        value: formatJourneyShare(pageRow.journeys, totalJourneys),
      },
    ];
  } else {
    stats = [journeyStat];
  }

  const breakdown = isSource ? (
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
        scrollFade
      />
    </section>
  ) : (
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
        scrollFade
      />
    </section>
  );

  return (
    <>
      <SheetHeader className="bg-muted/50 shrink-0 gap-1.5 border-b pr-14">
        <SheetTitle className="flex min-w-0 items-center gap-2 text-base leading-snug">
          {selection.kind === "source" ? (
            <>
              <EngineIcon className="size-4" engine={selection.source} />
              <span className="min-w-0 truncate">
                {formatGeoSource(selection.source)}
              </span>
              <Badge variant="secondary">
                {selection.visitorType === "crawler"
                  ? "Crawler"
                  : "AI referral"}
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

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
        <dl className="bg-muted/30 grid grid-cols-3 gap-4 rounded-xl border p-4">
          {stats.map((stat) => (
            <div className="flex min-w-0 flex-col gap-1.5" key={stat.label}>
              <dt className="text-muted-foreground truncate text-xs">
                {stat.label}
              </dt>
              <dd className="m-0 flex min-w-0 items-center gap-2">
                <span className="truncate text-xl leading-none font-semibold tracking-tight tabular-nums">
                  {stat.value}
                </span>
                {stat.delta === undefined ? null : (
                  <GeoStatDelta
                    delta={stat.delta}
                    hint={GEO_TRAFFIC_STAT_TREND_HINT}
                    label={stat.label}
                  />
                )}
              </dd>
            </div>
          ))}
        </dl>

        {trend.length >= GEO_SPARKLINE_MIN_POINTS ? (
          <section className="space-y-3">
            <SectionTitle title="Journeys per day" />
            <DailyTrendChart label="Journeys" points={trend} />
          </section>
        ) : null}

        {breakdown}

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
            scrollFade
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
