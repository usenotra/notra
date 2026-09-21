"use client";

import { GEO_SEARCH_LABEL } from "@notra/geo-core/constants/geo";
import type { GeoJourney } from "@notra/geo-core/types/geo";
import {
  formatAiTrafficTimestamp,
  formatGeoJourneyChip,
  formatGeoJourneySpan,
  formatGeoSource,
} from "@notra/geo-core/utils/ai-traffic";
import { GeoBar } from "@notra/ui/components/geo/geo-bar";

import { ChartSparkline } from "@/components/charts/chart-sparkline";
import { DirectionDelta } from "@/components/geo/directions/direction-delta";
import { DirectionDonut } from "@/components/geo/directions/direction-donut";
import { DirectionPagesTable } from "@/components/geo/directions/direction-pages-table";
import { EngineIcon } from "@/components/geo/engine-icon";
import { Table, type TableColumn } from "@/components/motion/table";
import { CHART_PRIMARY_COLOR } from "@/constants/charts";
import {
  GEO_DIRECTIONS_ENGINES,
  GEO_DIRECTIONS_GROUNDED_SERIES,
  GEO_DIRECTIONS_JOURNEYS,
  GEO_DIRECTIONS_VISIBILITY,
  GEO_DIRECTIONS_VISIBILITY_DELTA,
} from "@/constants/geo-directions";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type {
  DirectionSectionHeadingProps,
  GeoDirectionEngineRow,
} from "@/types/geo-directions";
import { formatMentionRate } from "@/utils/geo-charts";
import { tableHeightFor } from "@/utils/table";

const MAX_RATE = 1;

function SectionHeading({ children }: DirectionSectionHeadingProps) {
  return (
    <h2 className="text-foreground text-sm font-medium capitalize">
      {children}
    </h2>
  );
}

function EngineRank() {
  const columns: TableColumn<GeoDirectionEngineRow>[] = [
    {
      key: "label",
      header: "Engine",
      width: "1fr",
      sortable: true,
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <EngineIcon engine={row.engine} />
          <span className="truncate">{row.label}</span>
        </span>
      ),
    },
    {
      key: "bar",
      header: "Mention rate",
      width: "1.4fr",
      cell: (row) => <GeoBar max={MAX_RATE} value={row.rate} />,
      sortValue: (row) => row.rate,
    },
    {
      key: "rate",
      header: "Rate",
      width: "6rem",
      sortable: true,
      cell: (row) => (
        <span className="text-sm font-semibold tabular-nums">
          {formatMentionRate(row.rate)}
        </span>
      ),
    },
    {
      key: "delta",
      header: "\u0394",
      width: "5.5rem",
      sortable: true,
      cell: (row) => <DirectionDelta delta={row.delta} />,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground flex items-center justify-between px-1 text-xs">
        <span>{GEO_DIRECTIONS_ENGINES.length.toLocaleString()} engines</span>
      </div>
      <Table
        className="rounded-2xl"
        columns={columns}
        data={[...GEO_DIRECTIONS_ENGINES]}
        defaultSort={{ key: "rate", direction: "desc" }}
        emptyState="No engines scanned yet"
        getRowId={(row) => row.engine}
        height={tableHeightFor(GEO_DIRECTIONS_ENGINES.length)}
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
      />
    </div>
  );
}

function JourneysTable() {
  const columns: TableColumn<GeoJourney>[] = [
    {
      key: "journeyId",
      header: "Journey",
      width: "7.5rem",
      cell: (row) => (
        <span className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 font-mono text-xs">
          {formatGeoJourneyChip(row.journeyId)}
        </span>
      ),
    },
    {
      key: "source",
      header: "Source",
      width: "1fr",
      sortable: true,
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <EngineIcon engine={row.source} />
          <span className="truncate">{formatGeoSource(row.source)}</span>
        </span>
      ),
      sortValue: (row) => formatGeoSource(row.source),
    },
    {
      key: "pages",
      header: "Pages",
      width: "5.625rem",
      sortable: true,
      cell: (row) => <span className="text-sm tabular-nums">{row.pages}</span>,
    },
    {
      key: "distinctPaths",
      header: "Unique",
      width: "5.625rem",
      sortable: true,
      cell: (row) => (
        <span className="text-sm tabular-nums">{row.distinctPaths}</span>
      ),
    },
    {
      key: "span",
      header: "Span",
      width: "9.5rem",
      cell: (row) => (
        <span className="text-muted-foreground text-[0.6875rem] whitespace-nowrap tabular-nums">
          {formatGeoJourneySpan(row.firstSeenAt, row.lastSeenAt)}
        </span>
      ),
    },
    {
      key: "lastSeenAt",
      header: "Last seen",
      width: "9.375rem",
      sortable: true,
      cell: (row) => (
        <span className="text-muted-foreground text-[0.6875rem] whitespace-nowrap tabular-nums">
          {formatAiTrafficTimestamp(row.lastSeenAt)}
        </span>
      ),
    },
    {
      key: "entryPath",
      header: "Entry path",
      width: "1.2fr",
      cell: (row) => (
        <span className="block w-full min-w-0 truncate font-mono text-xs">
          {row.entryPath}
        </span>
      ),
      sortValue: (row) => row.entryPath,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground flex items-center justify-between px-1 text-xs">
        <span>{GEO_DIRECTIONS_JOURNEYS.length.toLocaleString()} journeys</span>
      </div>
      <Table
        className="rounded-2xl"
        columns={columns}
        data={[...GEO_DIRECTIONS_JOURNEYS]}
        defaultSort={{ key: "lastSeenAt", direction: "desc" }}
        emptyState="No agent journeys captured yet"
        getRowId={(row) => row.journeyId}
        height={tableHeightFor(GEO_DIRECTIONS_JOURNEYS.length)}
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
      />
    </div>
  );
}

export function DirectionLeaderboard() {
  return (
    <div className="divide-border divide-y">
      <section className="flex flex-wrap items-end gap-x-10 gap-y-6 pb-8">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm capitalize">
            AI visibility
          </p>
          <div className="flex items-end gap-3">
            <span className="text-[4.5rem] leading-none font-semibold tracking-tight tabular-nums">
              {formatMentionRate(GEO_DIRECTIONS_VISIBILITY)}
            </span>
            <DirectionDelta
              className="mb-2"
              delta={GEO_DIRECTIONS_VISIBILITY_DELTA}
            />
          </div>
        </div>
        <div className="min-w-[16rem] flex-1 space-y-1">
          <p className="text-muted-foreground text-xs capitalize">
            {GEO_SEARCH_LABEL} · last 12 days
          </p>
          <ChartSparkline
            className="h-20 w-full"
            color={CHART_PRIMARY_COLOR}
            data={[...GEO_DIRECTIONS_GROUNDED_SERIES]}
          />
        </div>
      </section>

      <section className="space-y-2 py-8">
        <SectionHeading>Engines, ranked</SectionHeading>
        <EngineRank />
      </section>

      <section className="md:divide-border grid gap-8 py-8 md:grid-cols-2 md:gap-10 md:divide-x">
        <div className="space-y-3 md:pr-10">
          <SectionHeading>Where AI sends people</SectionHeading>
          <DirectionPagesTable />
        </div>
        <div className="space-y-3">
          <SectionHeading>Share of voice</SectionHeading>
          <DirectionDonut />
        </div>
      </section>

      <section className="space-y-3 py-8">
        <SectionHeading>Agent journeys</SectionHeading>
        <JourneysTable />
      </section>
    </div>
  );
}
