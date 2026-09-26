"use client";

import { Route01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { GeoJourney } from "@notra/geo-core/types/geo";
import {
  formatAiTrafficTimestamp,
  formatGeoSource,
} from "@notra/geo-core/utils/ai-traffic";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import { JourneyEmpty } from "@/components/geo/journey-empty";
import { JourneyPathSummary } from "@/components/geo/journey-path-summary";
import {
  InstrumentEmpty,
  InstrumentModule,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { JourneysCardProps } from "@/types/geo";
import { withGeoProject } from "@/utils/geo-paths";
import { tableHeightFor } from "@/utils/table";

const JOURNEYS_PAGE_SIZE = 50;

export function JourneysCard({
  failed,
  journeys,
  organizationSlug,
  onOpenJourney,
  onPrefetchJourney,
  loading = false,
}: JourneysCardProps) {
  const [limit, setLimit] = useState(JOURNEYS_PAGE_SIZE);
  const { projectId } = useGeoProjectScope();
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

  if (journeys.length === 0) {
    return (
      <InstrumentModule eyebrow="Agent journeys">
        {failed ? (
          <InstrumentEmpty
            message="Could not load agent journeys. Try refreshing the page."
            seed="geo-journeys-error"
          />
        ) : (
          <JourneyEmpty
            action={
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={withGeoProject(
                      `/${organizationSlug}/geo/traffic`,
                      projectId
                    )}
                  />
                }
              >
                View AI traffic
              </Button>
            }
            className="min-h-72 px-6 py-10 [&_h3]:text-lg"
            description="Journeys appear when AI traffic reaches your site."
            media={<HugeiconsIcon icon={Route01Icon} className="size-5" />}
            title="See how AI agents explore your site"
          />
        )}
      </InstrumentModule>
    );
  }

  return (
    <InstrumentSection eyebrow="Agent journeys">
      <Table
        className="rounded-2xl"
        columns={columns}
        data={journeys}
        defaultSort={{ key: "lastSeenAt", direction: "desc" }}
        emptyState="No agent journeys captured yet"
        getRowId={(row) => row.journeyId}
        height={tableHeightFor(journeys.length)}
        loading={loading}
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
    </InstrumentSection>
  );
}
