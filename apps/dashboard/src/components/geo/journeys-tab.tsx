"use client";

import { GEO_JOURNEY_OVERVIEW_ROWS } from "@notra/geo-core/constants/geo";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMemo } from "react";

import { JourneyOverviewCard } from "@/components/geo/journey-overview-card";
import { JourneyPathsCard } from "@/components/geo/journey-paths-card";
import { JourneysCard } from "@/components/geo/journeys-card";
import {
  GeoSectionSkeleton,
  GeoTableSkeleton,
} from "@/components/geo/skeleton-parts";
import { InstrumentGrid } from "@/components/instrument/instrument-grid";
import { InstrumentReveal } from "@/components/instrument/instrument-reveal";
import type { JourneysTabProps } from "@/types/geo";
import { buildJourneyOverview } from "@/utils/geo-journey";

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
  loading,
  organizationId,
  revealActive,
}: JourneysTabProps) {
  const overview = useMemo(() => buildJourneyOverview(journeys), [journeys]);
  // Both cards preview the same number of rows so their tables line up.
  const previewRows = Math.max(
    1,
    Math.min(
      GEO_JOURNEY_OVERVIEW_ROWS,
      Math.max(overview.sources.length, overview.paths.length)
    )
  );

  if (loading) {
    return <JourneysTabSkeleton />;
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <InstrumentGrid className="grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <InstrumentReveal active={revealActive} className="h-full" order={0}>
          <JourneyOverviewCard overview={overview} previewRows={previewRows} />
        </InstrumentReveal>
        <InstrumentReveal active={revealActive} className="h-full" order={1}>
          <JourneyPathsCard overview={overview} previewRows={previewRows} />
        </InstrumentReveal>
      </InstrumentGrid>
      <InstrumentReveal active={revealActive} order={2}>
        <JourneysCard journeys={journeys} organizationId={organizationId} />
      </InstrumentReveal>
    </div>
  );
}
