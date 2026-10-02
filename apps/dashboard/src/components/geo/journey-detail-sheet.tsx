"use client";

import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { GeoJourney, GeoJourneyEvent } from "@notra/geo-core/types/geo";
import {
  formatAiTrafficTimestamp,
  formatGeoJourneySpan,
  formatGeoSource,
} from "@notra/geo-core/utils/ai-traffic";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMemo } from "react";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import { JourneyPathTree } from "@/components/geo/journey-path-tree";
import { SheetStatGrid } from "@/components/geo/sheet-stat-grid";
import { CountryFlag } from "@/components/geo/twemoji";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useGeoJourneyDetail } from "@/lib/hooks/use-geo";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import { cn } from "@/lib/utils";
import type { JourneyDetailSheetProps } from "@/types/geo";
import { copyToClipboard } from "@/utils/copy-to-clipboard";
import { countryName } from "@/utils/country";
import {
  buildJourneyPathTree,
  countJourneyBranches,
  formatGeoJourneyClock,
  formatGeoRefererSource,
  hasGeoJourneyReferers,
} from "@/utils/geo-journey";
import { tableHeightFor } from "@/utils/table";

const JOURNEY_SKELETON_ROWS = 6;
const JOURNEY_TREE_SKELETON = [
  { key: "a", className: "w-40" },
  { key: "b", className: "w-28" },
  { key: "c", className: "ml-8 w-36" },
  { key: "d", className: "ml-8 w-24" },
] as const;

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {meta ? (
        <p className="text-muted-foreground text-xs text-pretty">{meta}</p>
      ) : null}
    </div>
  );
}

function JourneyDetailContent({
  journey,
  events,
  isLoading,
}: {
  journey: GeoJourney;
  events: GeoJourneyEvent[];
  isLoading: boolean;
}) {
  const t = useTranslations("geo.journeyDetailSheet");
  const tGeoShared = useTranslations("geo.shared");
  const tTime = useTranslations("common.time");
  const locale = useLocale();
  const tree = useMemo(() => buildJourneyPathTree(events), [events]);
  const branches = countJourneyBranches(tree);
  const showReferer = !isLoading && hasGeoJourneyReferers(events);
  const columns: TableColumn<GeoJourneyEvent>[] = [
    {
      key: "capturedAt",
      header: t("columns.time"),
      width: "7.5rem",
      cell: (event) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
          {formatGeoJourneyClock(event.capturedAt, locale)}
        </span>
      ),
    },
    {
      key: "path",
      header: tGeoShared("path"),
      width: "1fr",
      minWidth: "10rem",
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
      header: t("columns.referer"),
      width: "8rem",
      cell: (event) => (
        <span className="block truncate text-xs">
          {formatGeoRefererSource(event.referer) || "-"}
        </span>
      ),
    });
  }
  columns.push({
    key: "country",
    header: tGeoShared("country"),
    width: "9rem",
    cell: (event) =>
      event.country ? (
        <span className="flex min-w-0 items-center gap-2 text-xs">
          <CountryFlag className="size-4 shrink-0" code={event.country} />
          <span className="truncate">{countryName(event.country, locale)}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
  });
  const fetchLimitMeta =
    !isLoading && events.length > 0 && events.length < journey.pages
      ? t("fetchLimitMeta", {
          shown: events.length.toLocaleString(locale),
          total: journey.pages.toLocaleString(locale),
        })
      : undefined;
  const branchMeta =
    branches > 0 ? t("branchMeta", { count: branches }) : undefined;
  const pathMeta =
    [fetchLimitMeta, branchMeta].filter(Boolean).join(" · ") || undefined;
  const stats = [
    {
      label: tGeoShared("span"),
      value: formatGeoJourneySpan(
        journey.firstSeenAt,
        journey.lastSeenAt,
        tTime("underAMinute"),
        locale
      ),
    },
    {
      label: tGeoShared("fetches"),
      value: journey.pages.toLocaleString(locale),
    },
    {
      label: t("stats.uniquePages"),
      value: journey.distinctPaths.toLocaleString(locale),
    },
  ];

  return (
    <>
      <SheetHeader className="bg-muted/50 shrink-0 gap-1.5 border-b pr-14">
        <SheetTitle className="flex min-w-0 items-center gap-2 text-base leading-snug">
          <EngineIcon className="size-4" engine={journey.source} />
          <span className="min-w-0 truncate">
            {formatGeoSource(journey.source)}
          </span>
          <Badge variant="secondary">
            {journey.visitorType === "crawler"
              ? tGeoShared("crawler")
              : tGeoShared("aiReferral")}
          </Badge>
        </SheetTitle>
        <SheetDescription className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            {tGeoShared("lastSeenTime", {
              time: formatAiTrafficTimestamp(journey.lastSeenAt, locale),
            })}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <span className="bg-muted truncate rounded-sm px-1.5 py-0.5 font-mono text-xs">
              {journey.journeyId}
            </span>
            <Button
              aria-label={t("copyJourneyId")}
              className="size-6"
              onClick={() => copyToClipboard(journey.journeyId)}
              size="icon"
              variant="ghost"
            >
              <HugeiconsIcon className="size-3.5" icon={Copy01Icon} />
            </Button>
          </span>
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
        <SheetStatGrid stats={stats} />

        <section className="space-y-3">
          <SectionHeader meta={pathMeta} title={tGeoShared("path")} />
          <div className="bg-muted/30 max-h-96 overflow-auto overscroll-contain rounded-xl border p-4">
            {isLoading ? (
              <div aria-hidden className="flex flex-col gap-3">
                {JOURNEY_TREE_SKELETON.map((row) => (
                  <Skeleton
                    className={cn("h-6 rounded-full", row.className)}
                    key={row.key}
                  />
                ))}
              </div>
            ) : (
              <JourneyPathTree roots={tree} />
            )}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader meta={fetchLimitMeta} title={tGeoShared("fetches")} />
          <Table
            className="rounded-2xl"
            columns={columns}
            data={events}
            emptyState={t("noFetches")}
            getRowId={(event, index) =>
              `${event.capturedAt}-${event.path}-${index}`
            }
            height={tableHeightFor(
              isLoading ? JOURNEY_SKELETON_ROWS : events.length
            )}
            loading={isLoading}
            rowHeight={TABLE_ROW_HEIGHT}
            skeletonRows={JOURNEY_SKELETON_ROWS}
          />
        </section>
      </div>
    </>
  );
}

export function JourneyDetailSheet({
  open,
  onOpenChange,
  organizationId,
  journey: journeyProp,
}: JourneyDetailSheetProps) {
  const [journey, releaseJourney] = useRetainedValue(journeyProp);
  const { data, isLoading } = useGeoJourneyDetail(
    organizationId,
    journey?.journeyId ?? null
  );
  const events = useMemo(() => data?.events ?? [], [data]);

  return (
    <Sheet
      onOpenChange={onOpenChange}
      onOpenChangeComplete={releaseJourney}
      open={open}
    >
      <SheetContent className="gap-0 overflow-hidden rounded-2xl data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-[calc(100%-1rem)] data-[side=right]:border data-[side=right]:sm:max-w-3xl">
        {journey ? (
          <JourneyDetailContent
            events={events}
            isLoading={isLoading}
            journey={journey}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
