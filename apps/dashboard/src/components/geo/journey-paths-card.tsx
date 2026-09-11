"use client";

import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { useMemo } from "react";

import {
  InstrumentEmpty,
  InstrumentModule,
} from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { GeoJourneyPathRow, JourneyPathsCardProps } from "@/types/geo";
import { buildJourneyOverview } from "@/utils/geo-journey";
import { tableHeightFor } from "@/utils/table";

export function JourneyPathsCard({ journeys }: JourneyPathsCardProps) {
  const overview = useMemo(() => buildJourneyOverview(journeys), [journeys]);
  const columns: TableColumn<GeoJourneyPathRow>[] = [
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

  return (
    <InstrumentModule className="h-full" eyebrow="Fetched pages">
      {overview.uniquePaths === 0 ? (
        <InstrumentEmpty
          className="h-40"
          message="No fetched pages yet"
          seed="geo-journey-paths"
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
            {overview.uniquePaths.toLocaleString()}
          </p>
          <div>
            <Table
              className="rounded-2xl"
              columns={columns}
              data={overview.paths}
              defaultSort={{ key: "journeys", direction: "desc" }}
              getRowId={(row) => row.path}
              height={tableHeightFor(overview.paths.length)}
              resizable
              rowHeight={TABLE_ROW_HEIGHT}
            />
            {overview.uniquePaths > overview.paths.length ? (
              <p className="text-muted-foreground px-1 pt-2 text-xs tabular-nums">
                +
                {(
                  overview.uniquePaths - overview.paths.length
                ).toLocaleString()}{" "}
                more pages
              </p>
            ) : null}
          </div>
        </div>
      )}
    </InstrumentModule>
  );
}
