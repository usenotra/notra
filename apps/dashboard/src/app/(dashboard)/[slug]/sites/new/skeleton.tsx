"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "next-intl";

import { PageHeading } from "@/components/layout/page-heading";
import { SitesPageShell } from "@/components/sites/sites-page-shell";

export function NewSitePageSkeleton() {
  const t = useTranslations("sites.new");
  return (
    <SitesPageShell>
      <PageHeading description={t("description")} title={t("title")} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,42rem)_18rem]">
        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <Skeleton className="hidden h-72 rounded-2xl lg:block" />
      </div>
    </SitesPageShell>
  );
}
