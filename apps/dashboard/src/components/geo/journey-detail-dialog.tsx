"use client";

import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_JOURNEY_TRAIL_DETAIL_LIMIT } from "@notra/geo-core/constants/geo";
import type { GeoJourneyEvent } from "@notra/geo-core/types/geo";
import {
  formatGeoJourneySpan,
  formatGeoSource,
} from "@notra/geo-core/utils/ai-traffic";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMemo } from "react";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import { JourneyPathTrail } from "@/components/geo/journey-path-trail";
import { CountryFlag } from "@/components/geo/twemoji";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useGeoJourneyDetail } from "@/lib/hooks/use-geo";
import type { JourneyDetailDialogProps } from "@/types/geo";
import { copyToClipboard } from "@/utils/copy-to-clipboard";
import { countryName } from "@/utils/country";
import {
  formatGeoJourneyClock,
  formatGeoRefererSource,
  hasGeoJourneyReferers,
} from "@/utils/geo-journey";
import { tableHeightFor } from "@/utils/table";

const JOURNEY_EVENT_SKELETON_ROW_KEYS = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
] as const;

export function JourneyDetailDialog({
  open,
  onOpenChange,
  organizationId,
  journey,
}: JourneyDetailDialogProps) {
  const { data, isLoading } = useGeoJourneyDetail(
    organizationId,
    open ? (journey?.journeyId ?? null) : null
  );

  const events = useMemo(() => data?.events ?? [], [data]);
  const eventPaths = useMemo(() => events.map((event) => event.path), [events]);

  if (!journey) {
    return null;
  }

  const showReferer = isLoading
    ? journey.visitorType !== "crawler"
    : hasGeoJourneyReferers(events);
  const skeletonRows = Math.min(
    Math.max(journey.pages, 1),
    JOURNEY_EVENT_SKELETON_ROW_KEYS.length
  );
  const displayedPaths =
    eventPaths.length > 0 ? eventPaths : journey.samplePaths;

  const columns: TableColumn<GeoJourneyEvent>[] = [
    {
      key: "capturedAt",
      header: "Time",
      width: "6rem",
      cell: (event) => (
        <span className="text-muted-foreground text-[0.6875rem] whitespace-nowrap tabular-nums">
          {formatGeoJourneyClock(event.capturedAt)}
        </span>
      ),
    },
    {
      key: "path",
      header: "Path",
      width: "1fr",
      minWidth: "12rem",
      cell: (event) => (
        <span className="block truncate font-mono text-xs" title={event.path}>
          {event.path}
        </span>
      ),
    },
  ];
  if (showReferer) {
    columns.push({
      key: "referer",
      header: "Referer",
      width: "9rem",
      cell: (event) => formatGeoRefererSource(event.referer),
    });
  }
  columns.push({
    key: "country",
    header: "Country",
    width: "10rem",
    cell: (event) =>
      event.country ? (
        <span className="flex min-w-0 items-center gap-2">
          <CountryFlag className="size-4 shrink-0" code={event.country} />
          <span className="truncate">{countryName(event.country)}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
  });

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-3xl [&>*]:min-w-0">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Agent journey</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            How this agent moved through your site, one fetch at a time.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-4 px-4 md:px-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 font-mono text-xs">
              {journey.journeyId}
            </span>
            <Button
              aria-label="Copy journey id"
              onClick={() => copyToClipboard(journey.journeyId)}
              size="icon"
              variant="ghost"
            >
              <HugeiconsIcon className="size-4" icon={Copy01Icon} />
            </Button>
            <span className="inline-flex items-center gap-2 text-sm">
              <EngineIcon engine={journey.source} />
              {formatGeoSource(journey.source)}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground text-xs">Visitor</dt>
              <dd className="text-sm">
                {journey.visitorType === "crawler" ? "Crawler" : "AI referral"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Span</dt>
              <dd className="text-sm tabular-nums">
                {formatGeoJourneySpan(journey.firstSeenAt, journey.lastSeenAt)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Pages</dt>
              <dd className="text-sm tabular-nums">{journey.pages}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Unique paths</dt>
              <dd className="text-sm tabular-nums">{journey.distinctPaths}</dd>
            </div>
          </dl>
          {isLoading ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {JOURNEY_EVENT_SKELETON_ROW_KEYS.slice(0, skeletonRows).map(
                (key) => (
                  <Skeleton className="h-5 w-20 rounded-full" key={key} />
                )
              )}
            </div>
          ) : null}
          {!isLoading ? (
            <JourneyPathTrail
              limit={GEO_JOURNEY_TRAIL_DETAIL_LIMIT}
              paths={displayedPaths}
            />
          ) : null}
          <Table
            columns={columns}
            data={events}
            emptyState="No events captured for this journey"
            getRowId={(event, index) =>
              `${event.capturedAt}-${event.path}-${index}`
            }
            height={tableHeightFor(isLoading ? skeletonRows : events.length)}
            loading={isLoading}
            rowHeight={TABLE_ROW_HEIGHT}
          />
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
