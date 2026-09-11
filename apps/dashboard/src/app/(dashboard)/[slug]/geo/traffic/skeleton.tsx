"use client";

import { GEO_TRAFFIC_FUNNEL_STAGES } from "@notra/geo-core/constants/geo";
import { Skeleton } from "@notra/ui/components/ui/skeleton";

import {
  GeoSectionSkeleton,
  GeoTableSkeleton,
} from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";

const SOURCE_ROW_COUNT = 4;
const PAGE_ROW_COUNT = 4;
const CITATION_ROW_COUNT = 6;

export function GeoTrafficSkeleton() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">AI Traffic</h1>
          <p className="text-muted-foreground text-sm">
            AI crawlers and referrals visiting your site
          </p>
        </header>
        <div className="flex flex-col gap-6">
          <div className="border-border bg-card overflow-hidden rounded-2xl border">
            <div className="bg-muted/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {GEO_TRAFFIC_FUNNEL_STAGES.map((stage) => (
                <div
                  className="border-border space-y-3 border-b px-5 py-5 last:border-b-0 sm:px-6 sm:odd:border-r sm:nth-[n+3]:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0"
                  key={stage.key}
                >
                  <Skeleton className="h-6 w-32" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-7 w-12 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-border border-t p-4">
              <Skeleton className="h-52 w-full rounded-xl" />
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
