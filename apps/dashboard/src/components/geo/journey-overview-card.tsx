"use client";

import { GEO_JOURNEY_DEEP_CRAWL_PAGES } from "@notra/geo-core/constants/geo";
import { formatGeoSource } from "@notra/geo-core/utils/ai-traffic";

import { EngineIcon } from "@/components/geo/engine-icon";
import { JourneyStatCard } from "@/components/geo/journey-stat-card";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type {
  GeoJourneySourceRow,
  JourneyOverviewCardProps,
} from "@/types/geo";
import { tableHeightFor } from "@/utils/table";

const sourceRowId = (row: GeoJourneySourceRow) =>
  `${row.source}-${row.visitorType}`;

const SOURCE_COLUMNS: TableColumn<GeoJourneySourceRow>[] = [
  {
    key: "source",
    header: "Source",
    width: "1fr",
    sortable: true,
    sortValue: (row) => formatGeoSource(row.source),
    cell: (row) => (
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <EngineIcon engine={row.source} />
        <span className="truncate">{formatGeoSource(row.source)}</span>
      </span>
    ),
  },
  {
    key: "journeys",
    header: "Journeys",
    width: "7rem",
    align: "right",
    sortable: true,
    cell: (row) => (
      <span className="text-sm tabular-nums">
        {row.journeys.toLocaleString()}
      </span>
    ),
  },
];

function shareLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function JourneyOverviewCard({
  overview,
  previewRows,
}: JourneyOverviewCardProps) {
  return (
    <JourneyStatCard
      caption={overview.total === 1 ? "journey" : "journeys"}
      emptyMessage="No agent journeys captured yet"
      emptySeed="geo-journey-overview"
      eyebrow="Journeys"
      stats={[
        {
          label: "Median depth",
          value: `${overview.medianPages} ${overview.medianPages === 1 ? "page" : "pages"}`,
        },
        {
          label: "Single fetch",
          value: shareLabel(overview.singleFetchShare),
        },
        {
          label: `Crawled ${GEO_JOURNEY_DEEP_CRAWL_PAGES}+ pages`,
          value: shareLabel(overview.deepShare),
        },
      ]}
      total={overview.total}
    >
      <Table
        className="rounded-2xl"
        columns={SOURCE_COLUMNS}
        data={overview.sources}
        defaultSort={{ key: "journeys", direction: "desc" }}
        getRowId={sourceRowId}
        height={tableHeightFor(previewRows)}
        rowHeight={TABLE_ROW_HEIGHT}
        scrollFade
      />
    </JourneyStatCard>
  );
}
