"use client";

import { GEO_JOURNEY_OVERVIEW_ROWS } from "@notra/geo-core/constants/geo";
import type { GeoJourney } from "@notra/geo-core/types/geo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMemo, useState } from "react";

import { JourneyDetailSheet } from "@/components/geo/journey-detail-sheet";
import { JourneyGroupSheet } from "@/components/geo/journey-group-sheet";
import { JourneyOverviewCard } from "@/components/geo/journey-overview-card";
import { JourneyPathsCard } from "@/components/geo/journey-paths-card";
import { JourneysCard } from "@/components/geo/journeys-card";
import {
  GeoSectionSkeleton,
  GeoTableSkeleton,
} from "@/components/geo/skeleton-parts";
import { InstrumentGrid } from "@/components/instrument/instrument-grid";
import { InstrumentReveal } from "@/components/instrument/instrument-reveal";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { usePrefetchGeoJourneyDetail } from "@/lib/hooks/use-geo";
import type { GeoJourneyGroupSelection, JourneysTabProps } from "@/types/geo";
import { journeyTrendDays } from "@/utils/geo-journey";

const JOURNEY_TABLE_SKELETON_ROWS = 6;
const STAT_SKELETON_KEYS = ["a", "b", "c"] as const;

function JourneyStatCardSkeleton({ eyebrow }: { eyebrow: string }) {
  return (
    <div className="bg-card flex flex-col gap-5 rounded-xl border p-6">
      <div className="flex h-7 items-center justify-between">
        <p className="text-sm font-medium">{eyebrow}</p>
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-9 w-32" />
      <div className="grid grid-cols-3 gap-3">
        {STAT_SKELETON_KEYS.map((key) => (
          <div className="space-y-1.5" key={key}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
      <GeoTableSkeleton rows={GEO_JOURNEY_OVERVIEW_ROWS} />
    </div>
  );
}

function JourneysTabSkeleton() {
  return (
    <div aria-busy="true" className="mt-6 flex flex-col gap-6">
      <span className="sr-only">Loading agent journeys</span>
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <JourneyStatCardSkeleton eyebrow="Journeys" />
        <JourneyStatCardSkeleton eyebrow="Fetched pages" />
      </div>
      <GeoSectionSkeleton eyebrow="Agent journeys">
        <GeoTableSkeleton rows={JOURNEY_TABLE_SKELETON_ROWS} />
      </GeoSectionSkeleton>
    </div>
  );
}

export function JourneysTab({
  journeys,
  journeyStats,
  journeyStatsFailed,
  loading,
  organizationId,
  revealActive,
}: JourneysTabProps) {
  const sources = journeyStats?.sources ?? [];
  const pages = journeyStats?.pages ?? [];
  const days = useMemo(
    () => journeyTrendDays(journeyStats?.sources ?? []),
    [journeyStats]
  );
  const activeSources = sources.filter((row) => row.journeys > 0).length;
  const [group, setGroup] = useState<GeoJourneyGroupSelection | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<GeoJourney | null>(
    null
  );
  const prefetchJourneyDetail = usePrefetchGeoJourneyDetail(organizationId);
  const prefetchJourney = (journey: GeoJourney) =>
    prefetchJourneyDetail(journey.journeyId);
  const openJourney = (journey: GeoJourney) => {
    trackEvent(POSTHOG_EVENTS.GEO_JOURNEY_OPENED, {
      visitor_type: journey.visitorType,
      source: journey.source,
      pages: journey.pages,
      distinct_paths: journey.distinctPaths,
    });
    // One drawer at a time: the journey replaces the source/page drawer.
    setGroup(null);
    setSelectedJourney(journey);
  };
  // Both cards preview the same number of rows so their tables line up.
  const previewRows = Math.max(
    1,
    Math.min(GEO_JOURNEY_OVERVIEW_ROWS, Math.max(activeSources, pages.length))
  );

  if (loading && journeys.length === 0) {
    return <JourneysTabSkeleton />;
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <InstrumentGrid className="grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <InstrumentReveal active={revealActive} className="h-full" order={0}>
          <JourneyOverviewCard
            failed={journeyStatsFailed}
            loading={loading}
            onOpenSource={(row) =>
              setGroup({
                kind: "source",
                source: row.source,
                visitorType: row.visitorType,
              })
            }
            previewRows={previewRows}
            sources={sources}
          />
        </InstrumentReveal>
        <InstrumentReveal active={revealActive} className="h-full" order={1}>
          <JourneyPathsCard
            failed={journeyStatsFailed}
            loading={loading}
            onOpenPath={(row) => setGroup({ kind: "page", path: row.path })}
            pages={pages}
            previewRows={previewRows}
            previousTotalPages={journeyStats?.previousTotalPages ?? 0}
            totalPages={journeyStats?.totalPages ?? 0}
          />
        </InstrumentReveal>
      </InstrumentGrid>
      <InstrumentReveal active={revealActive} order={2}>
        <JourneysCard
          journeys={journeys}
          loading={loading}
          onOpenJourney={openJourney}
          onPrefetchJourney={prefetchJourney}
        />
      </InstrumentReveal>
      <JourneyGroupSheet
        days={days}
        journeys={journeys}
        stats={journeyStats}
        onOpenChange={(open) => {
          if (!open) {
            setGroup(null);
          }
        }}
        onOpenJourney={openJourney}
        onPrefetchJourney={prefetchJourney}
        selection={group}
      />
      <JourneyDetailSheet
        journey={selectedJourney}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJourney(null);
          }
        }}
        open={selectedJourney !== null}
        organizationId={organizationId}
      />
    </div>
  );
}
