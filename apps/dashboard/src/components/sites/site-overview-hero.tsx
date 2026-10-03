"use client";

import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  FileEditIcon,
  GitBranchIcon,
  GithubIcon,
  Globe02Icon,
  Link04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";

import { InstrumentModule } from "@/components/instrument/instrument-module";
import { useSite } from "@/components/sites/site-context";
import { SitePreviewFrame } from "@/components/sites/site-preview-frame";
import { SiteStatusDot } from "@/components/sites/site-status-dot";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";
import type { SiteDeployment } from "@/types/sites";
import {
  deploymentElapsedMs,
  formatBuildDuration,
  isDeploymentInProgress,
} from "@/utils/site-deployments";
import {
  displayUrl,
  siteDeploymentHref,
  siteHref,
  siteUrlOnOrigin,
} from "@/utils/site-links";

const LINK_CLASS =
  "text-foreground decoration-foreground/25 hover:decoration-foreground min-w-0 truncate underline underline-offset-4 transition-colors duration-150";

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: IconSvgElement;
  label: string;
  children: ReactNode;
}) {
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

function ExternalLink({
  href,
  children,
  muted = false,
}: {
  href: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <a
      className="group inline-flex min-w-0 items-center gap-1"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className={cn(LINK_CLASS, muted && "text-muted-foreground")}>
        {children}
      </span>
      <HugeiconsIcon
        aria-hidden="true"
        className="text-muted-foreground group-hover:text-foreground size-3.5 shrink-0 transition-colors duration-150"
        icon={ArrowUpRight01Icon}
        strokeWidth={1.5}
      />
    </a>
  );
}

/** The production build that runs now or failed after the live one, as a link in the module header. */
function PendingProduction({ deployment }: { deployment: SiteDeployment }) {
  const t = useTranslations("sites.overviewPage");
  const { organizationSlug, siteId } = useSite();
  const inProgress = isDeploymentInProgress(deployment.status);
  const now = useNow(inProgress);
  const duration = inProgress
    ? formatBuildDuration(deploymentElapsedMs(deployment, now))
    : null;

  return (
    <Link
      className="group text-foreground hover:bg-background/70 -me-2 inline-flex h-7 items-center gap-3 rounded-md px-2 text-sm transition-colors duration-150"
      href={siteDeploymentHref(organizationSlug, siteId, deployment.id)}
    >
      <SiteStatusDot duration={duration} status={deployment.status} />
      <span className="text-muted-foreground group-hover:text-foreground inline-flex items-center gap-1 transition-colors duration-150 max-sm:hidden">
        {inProgress ? t("followBuild") : t("viewLogs")}
        <HugeiconsIcon
          aria-hidden="true"
          className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
          icon={ArrowRight01Icon}
          strokeWidth={1.5}
        />
      </span>
    </Link>
  );
}

/** What visitors see and where: a live preview next to the site's addresses, in a house module. */
export function SiteOverviewHero() {
  const t = useTranslations("sites.overviewPage");
  const tStatus = useTranslations("sites.status");
  const tDetail = useTranslations("sites.detail");
  const tDomainStatus = useTranslations("sites.domainStatus");
  const { organizationSlug, siteId, detail, liveDeployment } = useSite();
  const { site } = detail;
  const suspended = site.status === "suspended";
  const latestProduction =
    detail.deployments.find((deployment) => deployment.kind === "production") ??
    null;
  const pendingProduction =
    latestProduction &&
    latestProduction.id !== liveDeployment?.id &&
    (isDeploymentInProgress(latestProduction.status) ||
      latestProduction.status === "failed")
      ? latestProduction
      : null;
  const firstBuild =
    !liveDeployment &&
    pendingProduction !== null &&
    isDeploymentInProgress(pendingProduction.status);
  const previewUrl = liveDeployment && !suspended ? site.liveUrl : null;
  const customDomains = [...detail.domains].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary)
  );
  const aliasUrl = siteUrlOnOrigin(site.aliasOrigin, site.liveUrl);

  let status: ReactNode = null;
  if (pendingProduction && !suspended) {
    status = <PendingProduction deployment={pendingProduction} />;
  } else if (suspended || liveDeployment) {
    status = (
      <span className="inline-flex items-center gap-2 text-sm">
        <span
          aria-hidden="true"
          className={cn(
            "size-2 rounded-full",
            suspended ? "bg-muted-foreground/40" : "bg-success"
          )}
        />
        <span className="font-medium">
          {suspended ? tDetail("offline") : tStatus("live")}
        </span>
      </span>
    );
  }

  let previewFallback: ReactNode = null;
  if (suspended) {
    previewFallback = t("previewOffline");
  } else if (firstBuild) {
    previewFallback = t("previewBuilding");
  } else if (!liveDeployment) {
    previewFallback = t("previewNothingLive");
  }

  const preview = (
    <SitePreviewFrame
      className="rounded-lg"
      fallback={previewFallback}
      url={previewUrl}
    />
  );

  return (
    <InstrumentModule action={status} eyebrow={t("production")} variant="table">
      <div className="grid gap-5 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-8">
        {previewUrl ? (
          <a
            aria-hidden="true"
            className="block min-w-0 rounded-lg transition-opacity duration-150 hover:opacity-90"
            href={previewUrl}
            rel="noopener noreferrer"
            tabIndex={-1}
            target="_blank"
          >
            {preview}
          </a>
        ) : (
          preview
        )}

        <ul className="flex min-w-0 flex-col justify-center gap-3.5">
          <InfoRow icon={Globe02Icon} label={t("domains")}>
            {customDomains.length > 0 ? (
              customDomains.map((domain) => (
                <span
                  className="inline-flex min-w-0 items-center gap-2"
                  key={domain.id}
                >
                  <ExternalLink
                    href={
                      domain.isPrimary
                        ? site.liveUrl
                        : siteUrlOnOrigin(
                            `https://${domain.hostname}`,
                            site.liveUrl
                          )
                    }
                  >
                    {domain.isPrimary
                      ? displayUrl(site.liveUrl)
                      : domain.hostname}
                  </ExternalLink>
                  {domain.status === "active" ? null : (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {tDomainStatus(domain.status)}
                    </span>
                  )}
                </span>
              ))
            ) : (
              <>
                <ExternalLink href={aliasUrl}>
                  {displayUrl(aliasUrl)}
                </ExternalLink>
                <Link
                  className={cn(LINK_CLASS, "text-muted-foreground")}
                  href={siteHref(organizationSlug, siteId, "domains")}
                >
                  {t("addCustomDomain")}
                </Link>
              </>
            )}
          </InfoRow>
          {customDomains.length > 0 ? (
            <InfoRow icon={Link04Icon} label={t("notraAddress")}>
              <ExternalLink href={aliasUrl} muted>
                {displayUrl(aliasUrl)}
              </ExternalLink>
            </InfoRow>
          ) : null}
          <InfoRow icon={GithubIcon} label={t("repository")}>
            {site.repository ? (
              <ExternalLink
                href={`https://github.com/${site.repository.owner}/${site.repository.name}`}
              >
                {site.repository.owner} / {site.repository.name}
              </ExternalLink>
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
