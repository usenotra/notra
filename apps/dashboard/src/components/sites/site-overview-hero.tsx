"use client";

import {
  ArrowRight01Icon,
  FileEditIcon,
  GitBranchIcon,
  GithubIcon,
  Globe02Icon,
  Link04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { InstrumentModule } from "@notra/ui/components/instrument/instrument-module";
import { useTranslations } from "use-intl";

import Link from "@/components/framework/link";
import { useSite } from "@/components/sites/site-context";
import { SiteOverviewDomains } from "@/components/sites/site-overview-domains";
import { SiteOverviewExternalLink } from "@/components/sites/site-overview-external-link";
import { SiteOverviewPreview } from "@/components/sites/site-overview-preview";
import { SiteOverviewStatus } from "@/components/sites/site-overview-status";
import type { SiteOverviewInfoRowProps } from "@/types/components/sites";
import {
  isDeploymentInProgress,
  pendingProductionDeployment,
} from "@/utils/site-deployments";
import {
  displayUrl,
  githubRepositoryUrl,
  siteHref,
  siteUrlOnOrigin,
} from "@/utils/site-links";

function InfoRow({ icon, label, children }: SiteOverviewInfoRowProps) {
  return (
    <li className="flex min-w-0 items-center gap-2.5 text-sm">
      <HugeiconsIcon
        aria-label={label}
        className="text-muted-foreground size-4 shrink-0"
        icon={icon}
        role="img"
        strokeWidth={1.5}
      />
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        {children}
      </div>
    </li>
  );
}

export function SiteOverviewHero() {
  const t = useTranslations("sites.overviewPage");
  const { organizationSlug, siteId, detail, liveDeployment } = useSite();
  const { site } = detail;
  const suspended = site.status === "suspended";
  const pendingProduction = pendingProductionDeployment(detail, liveDeployment);
  const firstBuild =
    !liveDeployment &&
    pendingProduction !== null &&
    isDeploymentInProgress(pendingProduction.status);
  const customDomains = [...detail.domains].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary)
  );
  const aliasUrl = siteUrlOnOrigin(site.aliasOrigin, site.liveUrl);
  const hasStatus =
    suspended || pendingProduction !== null || liveDeployment !== null;

  return (
    <InstrumentModule
      action={
        hasStatus ? (
          <SiteOverviewStatus
            live={liveDeployment !== null}
            pendingProduction={pendingProduction}
            suspended={suspended}
          />
        ) : null
      }
      eyebrow={t("production")}
      variant="table"
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:gap-6">
        <SiteOverviewPreview
          firstBuild={firstBuild}
          live={liveDeployment !== null}
          suspended={suspended}
          url={liveDeployment && !suspended ? site.liveUrl : null}
        />

        <ul className="flex min-w-0 flex-col justify-center gap-2.5">
          <InfoRow icon={Globe02Icon} label={t("domains")}>
            <SiteOverviewDomains aliasUrl={aliasUrl} domains={customDomains} />
          </InfoRow>
          {customDomains.length > 0 ? (
            <InfoRow icon={Link04Icon} label={t("notraAddress")}>
              <SiteOverviewExternalLink href={aliasUrl} muted>
                {displayUrl(aliasUrl)}
              </SiteOverviewExternalLink>
            </InfoRow>
          ) : null}
          <InfoRow icon={GithubIcon} label={t("repository")}>
            {site.repository ? (
              <SiteOverviewExternalLink
                href={githubRepositoryUrl(site.repository)}
              >
                {site.repository.owner} / {site.repository.name}
              </SiteOverviewExternalLink>
            ) : (
              <span className="text-muted-foreground">{t("noRepository")}</span>
            )}
          </InfoRow>
          <InfoRow icon={GitBranchIcon} label={t("productionBranch")}>
            <span className="min-w-0 truncate font-mono text-xs">
              {site.productionBranch}
            </span>
          </InfoRow>
          {detail.draftCount > 0 ? (
            <InfoRow icon={FileEditIcon} label={t("drafts")}>
              <Link
                className="text-muted-foreground hover:text-foreground group inline-flex min-w-0 items-center gap-1 transition-colors duration-150"
                href={siteHref(organizationSlug, siteId, "editor")}
              >
                <span className="truncate">
                  {t("draftsHint", { count: detail.draftCount })}
                </span>
                <HugeiconsIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
                  icon={ArrowRight01Icon}
                  strokeWidth={1.5}
                />
              </Link>
            </InfoRow>
          ) : null}
        </ul>
      </div>
    </InstrumentModule>
  );
}
