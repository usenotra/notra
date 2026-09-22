"use client";

import type { GeoJourney } from "@notra/geo-core/types/geo";
import {
  formatAiTrafficTimestamp,
  formatGeoSource,
} from "@notra/geo-core/utils/ai-traffic";
import { useState } from "react";

import { EngineIcon } from "@/components/geo/engine-icon";
import { JourneyPathSummary } from "@/components/geo/journey-path-summary";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { JourneysCardProps } from "@/types/geo";
import { tableHeightFor } from "@/utils/table";

const JOURNEYS_PAGE_SIZE = 50;

export function JourneysCard({
  journeys,
  onOpenJourney,
  onPrefetchJourney,
}: JourneysCardProps) {
  const [limit, setLimit] = useState(JOURNEYS_PAGE_SIZE);
  const hasMore = limit < journeys.length;

  const columns: TableColumn<GeoJourney>[] = [
    {
      key: "source",
      header: "Source",
      width: "1fr",
      sortable: true,
      cell: (row) => (
        <button
          aria-label={`Open ${formatGeoSource(row.source)} journey from ${formatAiTrafficTimestamp(row.lastSeenAt)}`}
          className="focus-visible:ring-ring flex min-h-8 w-full min-w-0 items-center gap-2 rounded-sm text-left text-sm hover:underline focus-visible:ring-2"
          onClick={() => onOpenJourney(row)}
          type="button"
        >
          <EngineIcon engine={row.source} />
          <span className="truncate">{formatGeoSource(row.source)}</span>
        </button>
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
      header: "Path",
      width: "2fr",
      cell: (row) => (
        <JourneyPathSummary
          distinctPaths={row.distinctPaths}
          entryPath={row.entryPath}
          paths={row.samplePaths}
        />
      ),
      sortValue: (row) => row.entryPath,
    },
  ];

  return (
    <InstrumentSection eyebrow="Agent journeys">
      {journeys.length === 0 ? (
        <InstrumentEmpty
          message="No agent journeys captured yet"
          seed="geo-journeys"
        />
      ) : (
        <Table
          className="rounded-2xl"
          columns={columns}
          data={journeys}
          defaultSort={{ key: "lastSeenAt", direction: "desc" }}
          emptyState="No agent journeys captured yet"
          getRowId={(row) => row.journeyId}
          height={tableHeightFor(journeys.length)}
          onEndReached={
            hasMore
              ? () => setLimit((value) => value + JOURNEYS_PAGE_SIZE)
              : undefined
          }
          onRowClick={onOpenJourney}
          onRowPointerEnter={onPrefetchJourney}
          pageSize={limit}
          resizable
          rowHeight={TABLE_ROW_HEIGHT}
        />
      )}
    </InstrumentSection>
  );
}
