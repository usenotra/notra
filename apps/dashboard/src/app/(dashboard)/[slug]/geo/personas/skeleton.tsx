"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import {
  GEO_PERSONA_SKELETON_ROW_COUNT,
  GEO_PERSONAS_PAGE_DESCRIPTION,
  GEO_PERSONAS_PAGE_TITLE,
} from "@/constants/geo-personas";

export function GeoPersonasSkeleton() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeader
          description={GEO_PERSONAS_PAGE_DESCRIPTION}
          title={GEO_PERSONAS_PAGE_TITLE}
        >
          <Skeleton className="h-9 w-44 rounded-lg" />
        </PageHeader>
        <GeoTableSkeleton rows={GEO_PERSONA_SKELETON_ROW_COUNT} />
      </div>
    </PageContainer>
  );
}
