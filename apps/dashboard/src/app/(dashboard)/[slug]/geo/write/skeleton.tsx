"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "next-intl";

import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";

const BRIEF_ROW_COUNT = 6;

export function GeoWriterSkeleton({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const t = useTranslations("geo.pages.write");
  const tCommon = useTranslations("common");
  const table = <GeoTableSkeleton rows={BRIEF_ROW_COUNT} />;

  if (embedded) {
    return table;
  }

  return (
    <PageContainer
      className="flex h-full min-h-full flex-1 flex-col overflow-hidden py-4 md:py-6"
      data-geo-write-page=""
    >
      <div className="flex min-h-0 w-full flex-1 flex-col gap-6 px-4 lg:px-6">
        <header className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {tCommon("labels.write")}
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
              {t("descriptionPlain")}
            </p>
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </header>
        {table}
      </div>
    </PageContainer>
  );
}
