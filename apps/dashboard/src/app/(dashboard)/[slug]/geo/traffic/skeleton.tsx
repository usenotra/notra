"use client";

import { GEO_TRAFFIC_FUNNEL_STAGES } from "@notra/geo-core/constants/geo";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "next-intl";

import { GeoRangePicker } from "@/components/geo/geo-range-picker";
import {
  GeoSectionSkeleton,
  GeoTableSkeleton,
} from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import {
  TRAFFIC_HERO_CHART_SURFACE_CLASS,
  TRAFFIC_HERO_FRAME_CLASS,
  TRAFFIC_HERO_METRIC_CELL_CLASS,
  TRAFFIC_HERO_METRICS_GRID_CLASS,
  TRAFFIC_HERO_METRICS_SURFACE_CLASS,
} from "@/constants/geo-traffic-hero";
import { cn } from "@/lib/utils";
import type { GeoTrafficSkeletonProps } from "@/types/geo";

const SOURCE_ROW_COUNT = 4;
const PAGE_ROW_COUNT = 4;
const CITATION_ROW_COUNT = 6;

export function GeoTrafficSkeleton({ geoRange }: GeoTrafficSkeletonProps) {
  const t = useTranslations("geo.pages.traffic");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full min-w-0 space-y-6 px-4 lg:px-6">
        <PageHeader description={t("description")} title={t("title")}>
          {geoRange ? <GeoRangePicker control={geoRange} /> : null}
        </PageHeader>
        <div className="flex flex-col gap-6">
          <div className={TRAFFIC_HERO_FRAME_CLASS}>
            <div
              className={cn(
                TRAFFIC_HERO_METRICS_GRID_CLASS,
                TRAFFIC_HERO_METRICS_SURFACE_CLASS
              )}
            >
              {GEO_TRAFFIC_FUNNEL_STAGES.map((stage) => (
                <div className={TRAFFIC_HERO_METRIC_CELL_CLASS} key={stage.key}>
                  <Skeleton className="h-5 w-28" />
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <Skeleton className="h-6 w-14 @4xl/hero:h-8 @4xl/hero:w-16" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
            <div className={TRAFFIC_HERO_CHART_SURFACE_CLASS}>
              <Skeleton className="h-52 w-full rounded-xl @md/hero:h-72" />
            </div>
          </div>
          <GeoSectionSkeleton
            action={<Skeleton className="h-3.5 w-36" />}
            eyebrow={tCommon("labels.sources")}
          >
            <GeoTableSkeleton rows={SOURCE_ROW_COUNT} />
          </GeoSectionSkeleton>
          <GeoSectionSkeleton
            action={<Skeleton className="h-3.5 w-8" />}
            eyebrow={tGeoShared("topPagesByAiSource")}
          >
            <GeoTableSkeleton rows={PAGE_ROW_COUNT} />
          </GeoSectionSkeleton>
          <GeoSectionSkeleton
            action={<Skeleton className="h-3.5 w-24" />}
            eyebrow={tGeoShared("recentAiRequests")}
          >
            <GeoTableSkeleton rows={CITATION_ROW_COUNT} />
          </GeoSectionSkeleton>
        </div>
      </div>
    </PageContainer>
  );
}
