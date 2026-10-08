"use client";

import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { InstrumentSection } from "@notra/ui/components/instrument/instrument-module";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { useTranslations } from "use-intl";

import { Button, buttonVariants } from "@/components/button";
import Link from "@/components/framework/link";
import { useSite } from "@/components/sites/site-context";
import { SiteDeploymentsTable } from "@/components/sites/site-deployments-table";
import { SiteOverviewHero } from "@/components/sites/site-overview-hero";
import { SitePreviewsTable } from "@/components/sites/site-previews-table";
import { SiteRelativeTime } from "@/components/sites/site-relative-time";
import { SiteVisitorsCard } from "@/components/sites/site-visitors-card";
import {
  SITE_OVERVIEW_PREVIEWS_LIMIT,
  SITE_RECENT_DEPLOYMENTS_LIMIT,
  SITE_TABLE_COMPACT_EMPTY_HEIGHT,
} from "@/constants/sites";
import { useDeployLatest } from "@/lib/hooks/use-site-deployments";
import type {
  SiteUpdatedLineProps,
  SiteViewAllLinkProps,
} from "@/types/components/sites";
import { siteHref, sitePreviewDeploymentsHref } from "@/utils/site-links";
import { sitePreviewRows } from "@/utils/site-previews";

function ViewAllLink({ href, label }: SiteViewAllLinkProps) {
  return (
    <Link
      className={buttonVariants({ size: "sm", variant: "ghost" })}
      href={href}
    >
      {label}
      <HugeiconsIcon
        aria-hidden="true"
        data-icon="inline-end"
        icon={ArrowRight01Icon}
        strokeWidth={1.5}
      />
    </Link>
  );
}

function UpdatedLine({ deployment }: SiteUpdatedLineProps) {
  const t = useTranslations("sites.overviewPage");
  const tTriggers = useTranslations("sites.triggers");
  if (!deployment) {
    return t("notLiveYet");
  }
  const time = () => (
    <SiteRelativeTime
      date={deployment.liveSince ?? deployment.createdAt}
      inline
    />
  );
  return deployment.commitAuthor
    ? t.rich("updatedBy", { author: deployment.commitAuthor, time })
    : t.rich("updatedVia", { trigger: tTriggers(deployment.trigger), time });
}

export function SiteOverviewPage() {
  const t = useTranslations("sites.overviewPage");
  const tDetail = useTranslations("sites.detail");
  const tStatus = useTranslations("sites.status");
  const { organizationId, organizationSlug, siteId, detail, liveDeployment } =
    useSite();
  const { site } = detail;
  const suspended = site.status === "suspended";
  const deployLatest = useDeployLatest({ organizationId, siteId });
  const deployments = detail.deployments;
  const previews = sitePreviewRows(detail);
  const latestProduction =
    detail.deployments.find((deployment) => deployment.kind === "production") ??
    null;

  return (
    <div className="space-y-6">
      <PageHeading
        description={<UpdatedLine deployment={liveDeployment} />}
        title={site.name}
      >
        <div className="flex shrink-0 items-center gap-2">
          {liveDeployment ? (
            <a
              className={buttonVariants({ variant: "outline" })}
              href={site.liveUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t("visitSite")}
              <HugeiconsIcon
                aria-hidden="true"
                data-icon="inline-end"
                icon={ArrowUpRight01Icon}
                strokeWidth={1.5}
              />
            </a>
          ) : null}
        </div>
      </PageHeading>
      <span aria-live="polite" className="sr-only">
        {latestProduction
          ? tDetail("statusAnnouncement", {
              status: tStatus(latestProduction.status),
            })
          : null}
      </span>

      <SiteOverviewHero />

      {site.analyticsEnabled ? <SiteVisitorsCard /> : null}

      <InstrumentSection
        action={
          <Button
            disabled={suspended}
            loading={deployLatest.isPending}
            onClick={() => deployLatest.mutate()}
            size="sm"
            variant="outline"
          >
            <HugeiconsIcon
              aria-hidden="true"
              data-icon="inline-start"
              icon={RefreshIcon}
              strokeWidth={1.5}
            />
            {tDetail("deployLatest")}
          </Button>
        }
        eyebrow={t("activity")}
      >
        <SiteDeploymentsTable
          deployments={deployments}
          emptyHeight={SITE_TABLE_COMPACT_EMPTY_HEIGHT}
          emptyState={
            <p className="text-sm text-pretty">
              {t("activityEmptyDescription", {
                branch: site.productionBranch,
              })}
            </p>
          }
          organizationId={organizationId}
          organizationSlug={organizationSlug}
          pageSize={SITE_RECENT_DEPLOYMENTS_LIMIT}
          siteId={siteId}
        />
      </InstrumentSection>

      {previews.length > 0 ? (
        <InstrumentSection
          action={
            <ViewAllLink
              href={sitePreviewDeploymentsHref(organizationSlug, siteId)}
              label={t("viewAll")}
            />
          }
          eyebrow={t("previews")}
        >
          <SitePreviewsTable
            compact
            organizationId={organizationId}
            organizationSlug={organizationSlug}
            repository={site.repository}
            rows={previews.slice(0, SITE_OVERVIEW_PREVIEWS_LIMIT)}
            siteId={siteId}
          />
        </InstrumentSection>
      ) : null}
    </div>
  );
}
