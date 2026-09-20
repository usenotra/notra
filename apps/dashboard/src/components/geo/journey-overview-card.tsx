"use client";

import { GEO_JOURNEY_DEEP_CRAWL_PAGES } from "@notra/geo-core/constants/geo";
import type { GeoJourneySourceStats } from "@notra/geo-core/types/geo";
import {
  formatGeoSource,
  trafficVisitDelta,
} from "@notra/geo-core/utils/ai-traffic";

import { EngineIcon } from "@/components/geo/engine-icon";
import { JourneyCountCell } from "@/components/geo/journey-count-cell";
import { JourneyStatCard } from "@/components/geo/journey-stat-card";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { JourneyOverviewCardProps } from "@/types/geo";
import {
  formatJourneyDepth,
  formatJourneyShare,
  journeyTotals,
} from "@/utils/geo-journey";
import { tableHeightFor } from "@/utils/table";

const sourceRowId = (row: GeoJourneySourceStats) =>
  `${row.source}-${row.visitorType}`;

export function JourneyOverviewCard({
  sources,
  previewRows,
  onOpenSource,
}: JourneyOverviewCardProps) {
  const totals = journeyTotals(sources);
  const columns: TableColumn<GeoJourneySourceStats>[] = [
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
          <span className="text-muted-foreground shrink-0 text-xs">
            {row.visitorType === "crawler" ? "Crawler" : "AI referral"}
          </span>
        </span>
      ),
    },
    {
      key: "journeys",
      header: "Journeys",
      width: "9.5rem",
      align: "right",
      sortable: true,
      cell: (row) => (
        <JourneyCountCell
          journeys={row.journeys}
          label={formatGeoSource(row.source)}
          previousJourneys={row.previousJourneys}
        />
      ),
    },
  ];

  return (
    <JourneyStatCard
      caption={totals.journeys === 1 ? "journey" : "journeys"}
      delta={trafficVisitDelta(totals.journeys, totals.previousJourneys)}
      emptyMessage="No agent journeys captured yet"
      emptySeed="geo-journey-overview"
      eyebrow="Journeys"
      stats={[
        {
          label: "Avg. depth",
          value: formatJourneyDepth(totals.pages, totals.journeys),
        },
        {
          label: "Single fetch",
          value: formatJourneyShare(totals.singleFetch, totals.journeys),
        },
        {
          label: `Crawled ${GEO_JOURNEY_DEEP_CRAWL_PAGES}+ pages`,
          value: formatJourneyShare(totals.deepCrawls, totals.journeys),
        },
      ]}
      total={totals.journeys}
    >
      <Table
        className="rounded-2xl"
        columns={columns}
        data={sources.filter((row) => row.journeys > 0)}
        defaultSort={{ key: "journeys", direction: "desc" }}
        getRowId={sourceRowId}
        height={tableHeightFor(previewRows)}
        onRowClick={onOpenSource}
        rowHeight={TABLE_ROW_HEIGHT}
        scrollFade
      />
    </JourneyStatCard>
  );
}
