"use client";

import { GEO_TRAFFIC_FUNNEL_STAGES } from "@notra/geo-core/constants/geo";
import { Skeleton } from "@notra/ui/components/ui/skeleton";

import {
  GeoSectionSkeleton,
  GeoTableSkeleton,
} from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";
import {
  TRAFFIC_HERO_FRAME_CLASS,
  TRAFFIC_HERO_METRIC_CELL_CLASS,
  TRAFFIC_HERO_METRICS_GRID_CLASS,
} from "@/constants/geo-traffic-hero";
import { cn } from "@/lib/utils";

const SOURCE_ROW_COUNT = 4;
const PAGE_ROW_COUNT = 4;
const CITATION_ROW_COUNT = 6;

export function GeoTrafficSkeleton() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full min-w-0 space-y-6 px-4 lg:px-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            AI Traffic
          </h1>
          <p className="text-muted-foreground text-sm">
            AI crawlers and referrals visiting your site
          </p>
        </header>
        <div className="flex flex-col gap-6">
          <div className={TRAFFIC_HERO_FRAME_CLASS}>
            <div className={cn(TRAFFIC_HERO_METRICS_GRID_CLASS, "bg-muted/40")}>
              {GEO_TRAFFIC_FUNNEL_STAGES.map((stage) => (
                <div className={TRAFFIC_HERO_METRIC_CELL_CLASS} key={stage.key}>
                  <Skeleton className="h-5 w-28 @sm/hero:h-6 @sm/hero:w-32" />
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <Skeleton className="h-8 w-16 @4xl/hero:h-9 @4xl/hero:w-20" />
                    <Skeleton className="h-7 w-12 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-border border-t p-4">
              <Skeleton className="h-52 w-full rounded-xl @md/hero:h-72" />
            </div>
          </div>
          <GeoSectionSkeleton
            action={<Skeleton className="h-3.5 w-36" />}
            eyebrow="Sources"
          >
            <GeoTableSkeleton rows={SOURCE_ROW_COUNT} />
          </GeoSectionSkeleton>
          <GeoSectionSkeleton
            action={<Skeleton className="h-3.5 w-8" />}
            eyebrow="Top pages by AI source"
          >
            <GeoTableSkeleton rows={PAGE_ROW_COUNT} />
          </GeoSectionSkeleton>
          <GeoSectionSkeleton
            action={<Skeleton className="h-3.5 w-24" />}
            eyebrow="Recent AI requests"
          >
            <GeoTableSkeleton rows={CITATION_ROW_COUNT} />
          </GeoSectionSkeleton>
        </div>
      </div>
    </PageContainer>
  );
}
