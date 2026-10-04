"use client";

import { DataTableSkeleton } from "@notra/ui/components/ui/data-table";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";

const COMPETITOR_ROW_COUNT = 6;

export function CompetitorDetailSkeleton() {
  const tGeoShared = useTranslations("geo.shared");
  return (
    <div className="space-y-6">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-pretty">
          {tGeoShared("mentionsOverTime")}
        </h2>
        <Skeleton className="h-56 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function GeoCompetitorsSkeleton() {
  const t = useTranslations("geo.pages.competitors");
  const tCommon = useTranslations("common");
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description={t("description")}
          title={tCommon("labels.competitors")}
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-36 rounded-md" />
            <Skeleton className="h-7 w-48 rounded-md" />
          </div>
        </PageHeading>
        <Skeleton className="h-96 w-full rounded-2xl" />
        <DataTableSkeleton rows={COMPETITOR_ROW_COUNT} />
      </div>
    </PageContainer>
  );
}
