"use client";

import { useTranslations } from "use-intl";

import Link from "@/components/framework/link";
import { useSite } from "@/components/sites/site-context";
import { SiteOverviewExternalLink } from "@/components/sites/site-overview-external-link";
import { SITE_OVERVIEW_LINK_CLASS } from "@/constants/sites";
import { cn } from "@/lib/utils";
import type { SiteOverviewDomainsProps } from "@/types/components/sites";
import { displayUrl, siteHref, siteUrlOnOrigin } from "@/utils/site-links";

export function SiteOverviewDomains({
  domains,
  aliasUrl,
}: SiteOverviewDomainsProps) {
  const t = useTranslations("sites.overviewPage");
  const tDomainStatus = useTranslations("sites.domainStatus");
  const { organizationSlug, siteId, detail } = useSite();
  const { liveUrl } = detail.site;

  if (domains.length === 0) {
    return (
      <>
        <SiteOverviewExternalLink href={aliasUrl}>
          {displayUrl(aliasUrl)}
        </SiteOverviewExternalLink>
        <Link
          className={cn(SITE_OVERVIEW_LINK_CLASS, "text-muted-foreground")}
          href={siteHref(organizationSlug, siteId, "domains")}
        >
          {t("addCustomDomain")}
        </Link>
      </>
    );
  }
  return domains.map((domain) => (
    <span className="inline-flex min-w-0 items-center gap-2" key={domain.id}>
      <SiteOverviewExternalLink
        href={
          domain.isPrimary
            ? liveUrl
            : siteUrlOnOrigin(`https://${domain.hostname}`, liveUrl)
        }
      >
        {domain.isPrimary ? displayUrl(liveUrl) : domain.hostname}
      </SiteOverviewExternalLink>
      {domain.status === "active" ? null : (
        <span className="text-muted-foreground shrink-0 text-xs">
          {tDomainStatus(domain.status)}
        </span>
      )}
    </span>
  ));
}
