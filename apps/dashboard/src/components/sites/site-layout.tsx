"use client";

import { ORPCError } from "@orpc/client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { useSiteDetail, useSitesOrganizationId } from "@/lib/hooks/use-sites";
import { siteHref } from "@/utils/site-links";

import { SiteContext } from "./site-context";
import { SitePageSkeleton } from "./site-page-skeleton";
import { SitesPageShell } from "./sites-page-shell";
import { SitesUnavailableState } from "./sites-unavailable-state";

export function SiteLayout({
  organizationSlug,
  siteId,
  children,
}: {
  organizationSlug: string;
  siteId: string;
  children: ReactNode;
}) {
  const t = useTranslations("sites.detail");
  const organizationId = useSitesOrganizationId(organizationSlug);
  const detailQuery = useSiteDetail(organizationId, siteId);

  if (!detailQuery.data) {
    const error = detailQuery.error;
    if (error instanceof ORPCError && error.code === "SERVICE_UNAVAILABLE") {
      return (
        <SitesPageShell>
          <SitesUnavailableState />
        </SitesPageShell>
      );
    }
    if (error) {
      const notFound = error instanceof ORPCError && error.code === "NOT_FOUND";
      return (
        <SitesPageShell>
          <EmptyState
            action={
              <Link
                className={buttonVariants({ variant: "outline" })}
                href={`/${organizationSlug}/sites`}
              >
                {t("backToSites")}
              </Link>
            }
            description={
              notFound ? t("notFound.description") : t("loadFailed.description")
            }
            title={notFound ? t("notFound.title") : t("loadFailed.title")}
          />
        </SitesPageShell>
      );
    }
    return <SitePageSkeleton />;
  }

  const detail = detailQuery.data;
  const liveDeployment =
    detail.deployments.find(
      (deployment) => deployment.id === detail.site.liveDeploymentId
    ) ?? null;

  return (
    <SiteContext
      value={{
        organizationId,
        organizationSlug,
        siteId,
        detail,
        liveDeployment,
      }}
    >
      <SitesPageShell>
        {detail.site.status === "suspended" ? (
          <div
            className="bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
            role="status"
          >
            <p>{t("offlineDescription")}</p>
            <Link
              className="text-foreground text-sm font-medium hover:underline"
              href={siteHref(organizationSlug, siteId, "settings")}
            >
              {t("offlineAction")}
            </Link>
          </div>
        ) : null}
        {children}
      </SitesPageShell>
    </SiteContext>
  );
}
