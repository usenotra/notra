"use client";

import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { useState } from "react";

import { JourneyStatCard } from "@/components/geo/journey-stat-card";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { GeoJourneyPathRow, JourneyPathsCardProps } from "@/types/geo";
import { journeyPageKindStats } from "@/utils/geo-journey";
import { tableHeightFor } from "@/utils/table";

const PATHS_PAGE_SIZE = 50;

const pathRowId = (row: GeoJourneyPathRow) => row.path;

const PATH_COLUMNS: TableColumn<GeoJourneyPathRow>[] = [
  {
    key: "path",
    header: "Page",
    width: "1fr",
    sortable: true,
    cell: (row) => (
      <TruncateWithTooltip className="font-mono text-sm">
        {row.path}
      </TruncateWithTooltip>
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

export function JourneyPathsCard({
  overview,
  previewRows,
}: JourneyPathsCardProps) {
  const [limit, setLimit] = useState(PATHS_PAGE_SIZE);
  const hasMore = limit < overview.paths.length;

  return (
    <JourneyStatCard
      caption={overview.paths.length === 1 ? "page" : "pages"}
      emptyMessage="No fetched pages yet"
      emptySeed="geo-journey-paths"
      eyebrow="Fetched pages"
      stats={journeyPageKindStats(overview)}
      total={overview.paths.length}
    >
      <Table
        className="rounded-2xl"
        columns={PATH_COLUMNS}
        data={overview.paths}
        defaultSort={{ key: "journeys", direction: "desc" }}
        getRowId={pathRowId}
        height={tableHeightFor(previewRows)}
        onEndReached={
          hasMore
            ? () => setLimit((value) => value + PATHS_PAGE_SIZE)
            : undefined
        }
        pageSize={limit}
        rowHeight={TABLE_ROW_HEIGHT}
        scrollFade
      />
    </JourneyStatCard>
  );
}
