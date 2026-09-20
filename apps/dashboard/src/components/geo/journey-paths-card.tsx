"use client";

import type { GeoJourneyPageStats } from "@notra/geo-core/types/geo";
import { trafficVisitDelta } from "@notra/geo-core/utils/ai-traffic";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { useMemo } from "react";

import { JourneyCountCell } from "@/components/geo/journey-count-cell";
import { JourneyStatCard } from "@/components/geo/journey-stat-card";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { JourneyPathsCardProps } from "@/types/geo";
import {
  journeyPageKindCounts,
  journeyPageKindStats,
} from "@/utils/geo-journey";
import { tableHeightFor } from "@/utils/table";

const pathRowId = (row: GeoJourneyPageStats) => row.path;

export function JourneyPathsCard({
  pages,
  totalPages,
  previousTotalPages,
  previewRows,
  onOpenPath,
}: JourneyPathsCardProps) {
  const kindCounts = useMemo(() => journeyPageKindCounts(pages), [pages]);
  const sampled = totalPages > pages.length;
  const pageNoun = totalPages === 1 ? "page" : "pages";
  const columns: TableColumn<GeoJourneyPageStats>[] = [
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
      width: "9.5rem",
      align: "right",
      sortable: true,
      cell: (row) => (
        <JourneyCountCell
          journeys={row.journeys}
          label={row.path}
          previousJourneys={row.previousJourneys}
        />
      ),
    },
  ];

  return (
    <JourneyStatCard
      caption={sampled ? `${pageNoun} (top ${pages.length} shown)` : pageNoun}
      delta={trafficVisitDelta(totalPages, previousTotalPages)}
      emptyMessage="No fetched pages yet"
      emptySeed="geo-journey-paths"
      eyebrow="Fetched pages"
      stats={journeyPageKindStats(kindCounts, pages.length)}
      total={totalPages}
    >
      <Table
        className="rounded-2xl"
        columns={columns}
        data={pages}
        defaultSort={{ key: "journeys", direction: "desc" }}
        getRowId={pathRowId}
        height={tableHeightFor(previewRows)}
        onRowClick={onOpenPath}
        rowHeight={TABLE_ROW_HEIGHT}
        scrollFade
      />
    </JourneyStatCard>
  );
}
