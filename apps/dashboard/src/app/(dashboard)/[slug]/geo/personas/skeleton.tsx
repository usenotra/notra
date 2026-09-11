"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";
import {
  GEO_PERSONA_SKELETON_ROW_COUNT,
  GEO_PERSONAS_PAGE_DESCRIPTION,
  GEO_PERSONAS_PAGE_TITLE,
} from "@/constants/geo-personas";

export function GeoPersonasSkeleton() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {GEO_PERSONAS_PAGE_TITLE}
            </h1>
            <p className="text-muted-foreground">
              {GEO_PERSONAS_PAGE_DESCRIPTION}
            </p>
          </div>
          <Skeleton className="h-9 w-44 rounded-lg" />
        </header>
        <GeoTableSkeleton rows={GEO_PERSONA_SKELETON_ROW_COUNT} />
      </div>
    </PageContainer>
  );
}
