"use client";

import {
  BreadcrumbLink,
  BreadcrumbPage,
} from "@notra/ui/components/ui/breadcrumb";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import Link from "@/components/framework/link";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { useSiteDetail } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  DeploymentTopbarTitleProps,
  SiteSectionTopbarTitleProps,
  SiteTopbarTitleProps,
} from "@/types/components/sites";
import { shortSha } from "@/utils/site-deployments";

export function SiteTopbarTitle({ siteId, href }: SiteTopbarTitleProps) {
  const tCommon = useTranslations("common");
  const { activeOrganization } = useOrganizationsContext();
  const { data } = useSiteDetail(activeOrganization?.id ?? "", siteId);
  const label = data?.site.name ?? tCommon("labels.sites");
  if (href) {
    return (
      <BreadcrumbLink
        render={
          <Link className="block max-w-48 min-w-0 truncate" href={href}>
            {label}
          </Link>
        }
      />
    );
  }
  return (
    <BreadcrumbPage className="block min-w-0 truncate">{label}</BreadcrumbPage>
  );
}

export function DeploymentTopbarTitle({
  siteId,
  deploymentId,
}: DeploymentTopbarTitleProps) {
  const t = useTranslations("sites.deployments");
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";
  const { data } = useQuery(
    dashboardOrpc.sites.deployments.get.queryOptions({
      input: { organizationId, siteId, deploymentId },
      enabled: organizationId.length > 0,
    })
  );
  return (
    <BreadcrumbPage className="block min-w-0 truncate font-mono">
      {data ? shortSha(data.deployment.commitSha) : t("title")}
    </BreadcrumbPage>
  );
}

export function SiteSectionTopbarTitle({
  section,
  href,
}: SiteSectionTopbarTitleProps) {
  const t = useTranslations("sites.detail.tabs");
  if (href) {
    return <BreadcrumbLink render={<Link href={href}>{t(section)}</Link>} />;
  }
  return <BreadcrumbPage>{t(section)}</BreadcrumbPage>;
}
