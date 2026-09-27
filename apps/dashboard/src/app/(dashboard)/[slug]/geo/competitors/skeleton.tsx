"use client";

import { PlusSignIcon, Upload01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import {
  GeoSectionSkeleton,
  GeoTableSkeleton,
} from "@/components/geo/skeleton-parts";
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
  const tShared = useTranslations("geo.pages.shared");
  const tGeoShared = useTranslations("geo.shared");
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description={t("description")}
          title={tCommon("labels.competitors")}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-36 rounded-md" />
            <Button className="gap-1.5" variant="outline">
              <HugeiconsIcon className="size-4" icon={Upload01Icon} />
              {tShared("importCsv")}
            </Button>
            <Button className="gap-1.5">
              <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
              {tGeoShared("addCompetitor")}
              <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
            </Button>
          </div>
        </PageHeading>
        <GeoTableSkeleton rows={COMPETITOR_ROW_COUNT} />
        <GeoSectionSkeleton eyebrow={tGeoShared("shareOfVoice")}>
          <Skeleton className="h-64 w-full rounded-xl" />
        </GeoSectionSkeleton>
      </div>
    </PageContainer>
  );
}
