"use client";

import { GEO_JOURNEY_TRAIL_TABLE_LIMIT } from "@notra/geo-core/constants/geo";
import type { GeoJourney } from "@notra/geo-core/types/geo";
import {
  formatAiTrafficTimestamp,
  formatGeoSource,
} from "@notra/geo-core/utils/ai-traffic";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useState } from "react";

import { EngineIcon } from "@/components/geo/engine-icon";
import { JourneyDetailDialog } from "@/components/geo/journey-detail-dialog";
import { JourneyPathTrail } from "@/components/geo/journey-path-trail";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { trackEvent } from "@/lib/analytics/posthog-client";
import type { JourneysCardProps } from "@/types/geo";
import { tableHeightFor } from "@/utils/table";

export function JourneysCard({ journeys, organizationId }: JourneysCardProps) {
  const [selected, setSelected] = useState<GeoJourney | null>(null);
  const openJourney = (journey: GeoJourney) => {
    trackEvent(POSTHOG_EVENTS.GEO_JOURNEY_OPENED, {
      visitor_type: journey.visitorType,
      source: journey.source,
      pages: journey.pages,
      distinct_paths: journey.distinctPaths,
    });
    setSelected(journey);
  };

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
          onClick={() => openJourney(row)}
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
        <JourneyPathTrail
          className="flex-nowrap overflow-hidden"
          limit={GEO_JOURNEY_TRAIL_TABLE_LIMIT}
          paths={row.samplePaths}
        />
      ),
      sortValue: (row) => row.samplePaths[0] ?? "",
    },
  ];

  return (
    <InstrumentSection
      eyebrow="Agent journeys"
      readout={
        journeys.length > 0
          ? `${journeys.length.toLocaleString()} captured`
          : "no journeys yet"
      }
    >
      {journeys.length === 0 ? (
        <InstrumentEmpty
          message="No agent journeys captured yet"
          seed="geo-journeys"
        />
      ) : (
        <div className="flex flex-col gap-2">
          <Table
            className="rounded-2xl"
            columns={columns}
            data={journeys}
            defaultSort={{ key: "lastSeenAt", direction: "desc" }}
            emptyState="No agent journeys captured yet"
            getRowId={(row) => row.journeyId}
            height={tableHeightFor(journeys.length)}
            onRowClick={openJourney}
            resizable
            rowHeight={TABLE_ROW_HEIGHT}
          />
        </div>
      )}
      <JourneyDetailDialog
        journey={selected}
        onOpenChange={(next) => {
          if (!next) {
            setSelected(null);
          }
        }}
        open={selected !== null}
        organizationId={organizationId}
      />
    </InstrumentSection>
  );
}
