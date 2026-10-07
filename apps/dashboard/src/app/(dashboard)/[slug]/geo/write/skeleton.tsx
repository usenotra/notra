"use client";

import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { DataTableSkeleton } from "@notra/ui/components/ui/data-table";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { PageContainer } from "@/components/layout/container";

const BRIEF_ROW_COUNT = 6;

export function GeoWriterSkeleton({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const t = useTranslations("geo.pages.write");
  const tCommon = useTranslations("common");
  const table = <DataTableSkeleton rows={BRIEF_ROW_COUNT} />;

  if (embedded) {
    return table;
  }

  return (
    <PageContainer
      className="flex h-full min-h-full flex-1 flex-col overflow-hidden py-4 md:py-6"
      data-geo-write-page=""
    >
      <div className="flex min-h-0 w-full flex-1 flex-col gap-6 px-4 lg:px-6">
        <PageHeading
          className="@min-[40rem]/main:items-center"
          description={t("descriptionPlain")}
          title={tCommon("labels.write")}
        >
          <Skeleton className="h-9 w-32 rounded-md" />
        </PageHeading>
        {table}
      </div>
    </PageContainer>
  );
}
