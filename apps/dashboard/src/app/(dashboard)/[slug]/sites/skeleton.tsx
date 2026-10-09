"use client";

import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { DataTableSkeleton } from "@notra/ui/components/ui/data-table";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { SitesPageShell } from "@/components/sites/sites-page-shell";
import { SITES_PAGE_SKELETON_ROWS } from "@/constants/sites";

export function SitesPageSkeleton() {
  const t = useTranslations("sites");
  return (
    <SitesPageShell>
      <PageHeading description={t("description")} title={t("title")}>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </PageHeading>
      <DataTableSkeleton rows={SITES_PAGE_SKELETON_ROWS} />
    </SitesPageShell>
  );
}
