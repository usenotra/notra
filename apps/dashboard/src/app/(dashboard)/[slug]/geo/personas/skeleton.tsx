"use client";

import { DataTableSkeleton } from "@notra/ui/components/ui/data-table";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "next-intl";

import { PageContainer } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { GEO_PERSONA_SKELETON_ROW_COUNT } from "@/constants/geo-personas";

export function GeoPersonasSkeleton() {
  const t = useTranslations("geo.pages.personas");
  const tCommon = useTranslations("common");
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeader
          description={t("description")}
          title={tCommon("labels.personas")}
        >
          <Skeleton className="h-9 w-44 rounded-lg" />
        </PageHeader>
        <DataTableSkeleton rows={GEO_PERSONA_SKELETON_ROW_COUNT} />
      </div>
    </PageContainer>
  );
}
