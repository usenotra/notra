"use client";

import { GEO_JOURNEY_DEEP_CRAWL_PAGES } from "@notra/geo-core/constants/geo";
import { formatGeoSource } from "@notra/geo-core/utils/ai-traffic";
import { useMemo } from "react";

import { EngineIcon } from "@/components/geo/engine-icon";
import {
  InstrumentEmpty,
  InstrumentModule,
} from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type {
  GeoJourneySourceRow,
  JourneyOverviewCardProps,
} from "@/types/geo";
import { buildJourneyOverview } from "@/utils/geo-journey";
import { tableHeightFor } from "@/utils/table";

function shareLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function JourneyOverviewCard({ journeys }: JourneyOverviewCardProps) {
  const overview = useMemo(() => buildJourneyOverview(journeys), [journeys]);
  const columns: TableColumn<GeoJourneySourceRow>[] = [
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

  return (
    <InstrumentModule className="h-full" eyebrow="Journeys">
      {overview.total === 0 ? (
        <InstrumentEmpty
          className="h-40"
          message="No agent journeys captured yet"
          seed="geo-journey-overview"
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
            {overview.total.toLocaleString()}
          </p>
          <dl className="text-muted-foreground grid grid-cols-3 gap-3 text-xs">
            <div>
              <dt>Median depth</dt>
              <dd className="text-foreground mt-0.5 text-sm tabular-nums">
                {overview.medianPages}{" "}
                {overview.medianPages === 1 ? "page" : "pages"}
              </dd>
            </div>
            <div>
              <dt>Single-fetch</dt>
              <dd className="text-foreground mt-0.5 text-sm tabular-nums">
                {shareLabel(overview.singleFetchShare)}
              </dd>
            </div>
            <div>
              <dt>Crawl {GEO_JOURNEY_DEEP_CRAWL_PAGES}+</dt>
              <dd className="text-foreground mt-0.5 text-sm tabular-nums">
                {shareLabel(overview.deepShare)}
              </dd>
            </div>
          </dl>
          <div>
            <Table
              className="rounded-2xl"
              columns={columns}
              data={overview.sources}
              defaultSort={{ key: "journeys", direction: "desc" }}
              getRowId={(row) => `${row.source}-${row.visitorType}`}
              height={tableHeightFor(overview.sources.length)}
              resizable
              rowHeight={TABLE_ROW_HEIGHT}
            />
            {overview.uniqueSources > overview.sources.length ? (
              <p className="text-muted-foreground px-1 pt-2 text-xs tabular-nums">
                +
                {(
                  overview.uniqueSources - overview.sources.length
                ).toLocaleString()}{" "}
                more sources
              </p>
            ) : null}
          </div>
        </div>
      )}
    </InstrumentModule>
  );
}
