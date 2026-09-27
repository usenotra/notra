"use client";

import { GEO_GAPS_LOADING_STATUS } from "@notra/geo-core/constants/geo";
import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";

const GAP_ROW_COUNT = 6;

export function GeoGapsSkeleton({ embedded = false }: { embedded?: boolean }) {
  const table = (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex h-8 shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="bg-muted/40 flex items-center gap-0.5 rounded-lg border p-0.5">
          <Skeleton className="h-7 w-28 rounded-md" />
          <Skeleton className="h-7 w-28 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
      </div>
      <GeoTableSkeleton rows={GAP_ROW_COUNT} />
      <p aria-live="polite" className="sr-only">
        {GEO_GAPS_LOADING_STATUS}
      </p>
    </div>
  );

  if (embedded) {
    return table;
  }

  return (
    <PageContainer
      className="flex h-full min-h-full flex-1 flex-col overflow-hidden py-4 md:py-6"
      data-geo-gaps-page=""
    >
      <div className="flex min-h-0 w-full flex-1 flex-col gap-6 px-4 lg:px-6">
        <PageHeader
          description="Questions engines answer without mentioning you"
          title="Content Gaps"
        >
          <Skeleton className="h-9 w-36 rounded-md" />
        </PageHeader>
        {table}
      </div>
    </PageContainer>
  );
}
