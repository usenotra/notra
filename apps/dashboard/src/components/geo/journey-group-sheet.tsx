"use client";

import {
  GEO_JOURNEY_DEEP_CRAWL_PAGES,
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
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useMemo } from "react";
import { useLocale, useTranslations } from "use-intl";

import { DailyTrendChart } from "@/components/geo/daily-trend-chart";
import { EngineIcon } from "@/components/geo/engine-icon";
import { JourneyPathSummary } from "@/components/geo/journey-path-summary";
import { SheetStatGrid } from "@/components/geo/sheet-stat-grid";
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
  SheetStat,
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

function SectionTitle({ title, meta }: JourneyGroupSectionTitleProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {meta ? <p className="text-muted-foreground text-xs">{meta}</p> : null}
    </div>
  );
}

function JourneyGroupHeading({
  selection,
  lastSeen,
}: JourneyGroupHeadingProps) {
  const t = useTranslations("geo.journeyGroupSheet");
  const tGeoShared = useTranslations("geo.shared");
  const locale = useLocale();
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
              {selection.visitorType === "crawler"
                ? tGeoShared("crawler")
                : tGeoShared("aiReferral")}
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
            ? tGeoShared("lastSeenTime", {
                time: formatAiTrafficTimestamp(lastSeen, locale),
              })
            : t("noJourneysInRange")}
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
  const t = useTranslations("geo.journeyGroupSheet");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  const locale = useLocale();
  const journeysColumn = {
    key: "journeys",
    header: tCommon("labels.journeys"),
    width: "7rem",
    align: "right",
    cell: (row: { journeys: number }) => (
      <span className="text-sm tabular-nums">
        {row.journeys.toLocaleString(locale)}
      </span>
    ),
  } as const;
  const pageColumns: TableColumn<GeoJourneyPathRow>[] = [
    {
      key: "path",
      header: tGeoShared("page"),
      width: "1fr",
      cell: (row) => (
        <TruncateWithTooltip className="font-mono text-xs">
          {row.path}
        </TruncateWithTooltip>
      ),
    },
    journeysColumn,
  ];
  const sourceColumns: TableColumn<GeoJourneySourceRow>[] = [
    {
      key: "source",
      header: tCommon("labels.source"),
      width: "1fr",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <EngineIcon engine={row.source} />
          <span className="truncate">{formatGeoSource(row.source)}</span>
          <span className="text-muted-foreground shrink-0 text-xs">
            {row.visitorType === "crawler"
              ? tGeoShared("crawler")
              : tGeoShared("aiReferral")}
          </span>
        </span>
      ),
    },
    journeysColumn,
  ];
  if (isSource) {
    return (
      <section className="space-y-3">
        <SectionTitle meta={sampleMeta} title={t("pagesFetched")} />
        <DataTable
          columns={pageColumns}
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
      <SectionTitle meta={sampleMeta} title={tCommon("labels.sources")} />
      <DataTable
        columns={sourceColumns}
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
  const t = useTranslations("geo.journeyGroupSheet");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
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
    ? t("sampleMeta", { count: allJourneys.length.toLocaleString(locale) })
    : undefined;
  const stats: SheetStat[] = journeyGroupSheetStats({
    sourceRow,
    pageRow,
    totalJourneys,
    locale,
  }).map((stat) => {
    if (stat.key === "avgDepth") {
      return {
        label: tGeoShared("avgDepth"),
        value: tGeoShared("countPluralOnePageOther", { count: stat.depth }),
      };
    }
    if (stat.key === "journeys") {
      return {
        label: tCommon("labels.journeys"),
        value: stat.value,
        delta: stat.delta,
      };
    }
    return {
      label:
        stat.key === "deepCrawls"
          ? tGeoShared("crawledPagesPages", {
              pages: GEO_JOURNEY_DEEP_CRAWL_PAGES,
            })
          : t(`stats.${stat.key}`),
      value: stat.value,
      delta: stat.delta,
    };
  });
  const journeyColumns: TableColumn<GeoJourney>[] = [
    isSource
      ? {
          key: "entryPath",
          header: tGeoShared("path"),
          width: "1fr",
          cell: (row) => (
            <JourneyPathSummary
              distinctPaths={row.distinctPaths}
              entryPath={row.entryPath}
              paths={row.samplePaths}
            />
          ),
        }
      : {
          key: "source",
          header: tCommon("labels.source"),
          width: "1fr",
          cell: (row) => (
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <EngineIcon engine={row.source} />
              <span className="truncate">{formatGeoSource(row.source)}</span>
            </span>
          ),
        },
    {
      key: "pages",
      header: tGeoShared("pages"),
      width: "5.5rem",
      align: "right",
      cell: (row) => (
        <span className="text-sm tabular-nums">
          {row.pages.toLocaleString(locale)}
        </span>
      ),
    },
    {
      key: "lastSeenAt",
      header: tGeoShared("lastSeen"),
      width: "9.5rem",
      cell: (row) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
          {formatAiTrafficTimestamp(row.lastSeenAt, locale)}
        </span>
      ),
    },
  ];

  return (
    <>
      <JourneyGroupHeading lastSeen={lastSeen} selection={selection} />

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
        <SheetStatGrid stats={stats} />

        {trend.length >= GEO_SPARKLINE_MIN_POINTS ? (
          <section className="space-y-3">
            <SectionTitle title={t("journeysPerDay")} />
            <DailyTrendChart
              label={tCommon("labels.journeys")}
              points={trend}
            />
          </section>
        ) : null}

        <JourneyGroupBreakdown
          isSource={isSource}
          overview={overview}
          sampleMeta={sampleMeta}
        />

        <section className="space-y-3">
          <SectionTitle meta={sampleMeta} title={t("recentJourneys")} />
          <DataTable
            columns={journeyColumns}
            data={journeys}
            emptyState={t("noJourneysInRange")}
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
