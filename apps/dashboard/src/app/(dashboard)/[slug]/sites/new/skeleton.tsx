"use client";

import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { SitesPageShell } from "@/components/sites/sites-page-shell";

export function NewSitePageSkeleton() {
  const t = useTranslations("sites.new");
  return (
    <SitesPageShell>
      <PageHeading description={t("description")} title={t("title")} />
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </SitesPageShell>
  );
}
