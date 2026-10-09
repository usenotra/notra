"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { useTranslations } from "use-intl";

import { buttonVariants } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import Link from "@/components/framework/link";
import { SitesPageShell } from "@/components/sites/sites-page-shell";
import { SitesTable } from "@/components/sites/sites-table";
import { SitesUnavailableState } from "@/components/sites/sites-unavailable-state";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { useSitesList, useSitesOrganizationId } from "@/lib/hooks/use-sites";
import { cn } from "@/lib/utils";
import type { SitesPageClientProps } from "@/types/sites";

import { SitesPageSkeleton } from "./skeleton";

export default function PageClient({ organizationSlug }: SitesPageClientProps) {
  const t = useTranslations("sites");
  const organizationId = useSitesOrganizationId(organizationSlug);
  const listQuery = useSitesList(organizationId);
  const newSiteHref = `/${organizationSlug}/sites/new`;

  if (!listQuery.data) {
    if (listQuery.isError) {
      return (
        <SitesPageShell>
          <PageHeading description={t("description")} title={t("title")} />
          <EmptyState
            description={t("loadFailed.description")}
            title={t("loadFailed.title")}
          />
        </SitesPageShell>
      );
    }
    return <SitesPageSkeleton />;
  }

  const { configured, sites } = listQuery.data;
  const newSiteButton = (
    <Link
      className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
      href={newSiteHref}
    >
      <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
      {t("newSite")}
    </Link>
  );

  if (!configured) {
    return (
      <SitesPageShell>
        <PageHeading description={t("description")} title={t("title")} />
        <SitesUnavailableState />
      </SitesPageShell>
    );
  }

  return (
    <SitesPageShell>
      <PageHeading description={t("description")} title={t("title")}>
        {sites.length > 0 ? newSiteButton : null}
      </PageHeading>
      {sites.length === 0 ? (
        <EmptyState
          action={
            <Link className={buttonVariants()} href={newSiteHref}>
              <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
              {t("newSite")}
            </Link>
          }
          description={t("empty.description")}
          preview={
            <EmptyStateTablePreview
              columns={EMPTY_STATE_TABLE_COLUMNS.sites}
              rows={EMPTY_STATE_TABLE_ROWS}
            />
          }
          title={t("empty.title")}
        />
      ) : (
        <SitesTable
          organizationId={organizationId}
          organizationSlug={organizationSlug}
          sites={sites}
        />
      )}
    </SitesPageShell>
  );
}
