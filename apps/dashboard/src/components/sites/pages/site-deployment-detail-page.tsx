"use client";

import {
  ArrowTurnBackwardIcon,
  ArrowUpRight01Icon,
  InformationCircleIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { ORPCError } from "@orpc/client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";

import { Button, buttonVariants } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import Link from "@/components/framework/link";
import { SiteBuildLogs } from "@/components/sites/site-build-logs";
import { useSite } from "@/components/sites/site-context";
import { SiteDeploymentFailure } from "@/components/sites/site-deployment-failure";
import { SiteDeploymentSummary } from "@/components/sites/site-deployment-summary";
import { SiteRelativeTime } from "@/components/sites/site-relative-time";
import { SiteRollbackDialog } from "@/components/sites/site-rollback-dialog";
import {
  SITE_DEPLOYMENT_LOG_SURFACE_CLASS,
  SITE_DEPLOYMENT_SHELL_CLASS,
} from "@/constants/sites";
import {
  useRedeployDeployment,
  useSiteDeployment,
} from "@/lib/hooks/use-site-deployments";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import type {
  SiteDeploymentActionsProps,
  SiteDeploymentDetailPageProps,
  SiteDeploymentDetailProps,
  SiteDeploymentRecordProps,
} from "@/types/components/sites";
import type { SiteDeployment } from "@/types/sites";
import {
  commitTitle,
  deploymentServedUrls,
  isDeploymentInProgress,
  isDeploymentLive,
  shortSha,
} from "@/utils/site-deployments";
import { siteHref } from "@/utils/site-links";

export function SiteDeploymentDetailPage({
  deploymentId,
}: SiteDeploymentDetailPageProps) {
  const { organizationId, organizationSlug, siteId, detail } = useSite();
  const t = useTranslations("sites.deployment");
  const query = useSiteDeployment({ organizationId, siteId, deploymentId });

  if (!query.data) {
    if (query.error) {
      const notFound =
        query.error instanceof ORPCError && query.error.code === "NOT_FOUND";
      return (
        <EmptyState
          action={
            <Link
              className={buttonVariants({ variant: "outline" })}
              href={siteHref(organizationSlug, siteId, "deployments")}
            >
              {t("back")}
            </Link>
          }
          description={notFound ? t("notFound.description") : t("loadFailed")}
          title={notFound ? t("notFound.title") : t("loadFailedTitle")}
        />
      );
    }
    return <DeploymentDetailSkeleton />;
  }

  return (
    <DeploymentDetail
      deployment={query.data.deployment}
      detail={detail}
      key={deploymentId}
      log={query.data.log}
      organizationId={organizationId}
      siteId={siteId}
    />
  );
}

function DeploymentDetail({
  organizationId,
  siteId,
  detail,
  deployment,
  log,
}: SiteDeploymentDetailProps) {
  const t = useTranslations("sites.deploymentPage");
  const tStatus = useTranslations("sites.status");
  const tLegacy = useTranslations("sites.deployment");
  const invalidateSites = useInvalidateSites();
  const inProgress = isDeploymentInProgress(deployment.status);
  const live = isDeploymentLive(deployment, detail);
  const listEntry: SiteDeployment | null =
    detail.deployments.find((entry) => entry.id === deployment.id) ?? null;
  const [rollbackTarget, setRollbackTarget] = useState<SiteDeployment | null>(
    null
  );
  const wasInProgress = useRef(inProgress);

  useEffect(() => {
    if (wasInProgress.current && !inProgress) {
      invalidateSites();
    }
    wasInProgress.current = inProgress;
  }, [inProgress, invalidateSites]);

  const urls = deploymentServedUrls(deployment, detail, live);
  const primaryUrl = urls[0] ?? deployment.url;
  const title = commitTitle(deployment.commitMessage);
  const byline = deployment.commitAuthor
    ? t(`byline.${deployment.trigger}`, { author: deployment.commitAuthor })
    : t(`bylineAnonymous.${deployment.trigger}`);

  return (
    <div className="space-y-8">
      <span aria-live="polite" className="sr-only">
        {tLegacy("statusAnnouncement", { status: tStatus(deployment.status) })}
      </span>

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <h1
            className="line-clamp-2 text-2xl font-bold tracking-tight text-balance sm:text-3xl"
            title={title ?? undefined}
          >
            {title ?? tLegacy("title", { sha: shortSha(deployment.commitSha) })}
          </h1>
          <p className="text-muted-foreground text-sm">
            {byline} · <SiteRelativeTime date={deployment.createdAt} inline />
          </p>
          <DeploymentNote deployment={deployment} />
        </div>
        <DeploymentActions
          deployment={deployment}
          live={live}
          onRollback={() => setRollbackTarget(listEntry)}
          organizationId={organizationId}
          primaryUrl={primaryUrl}
          rollbackEntry={listEntry}
          siteId={siteId}
        />
      </header>

      <SiteDeploymentSummary
        deployment={deployment}
        detail={detail}
        live={live}
        primaryUrl={primaryUrl}
        urls={urls}
      />

      <SiteDeploymentFailure deployment={deployment} />

      <section className="space-y-3">
        <h2 className="text-sm font-medium">{t("log.title")}</h2>
        <div className={SITE_DEPLOYMENT_SHELL_CLASS}>
          <div className={SITE_DEPLOYMENT_LOG_SURFACE_CLASS}>
            <SiteBuildLogs
              inProgress={inProgress}
              log={log}
              queued={deployment.status === "queued"}
              startAtEnd={deployment.status === "failed"}
            />
          </div>
        </div>
      </section>

      <SiteRollbackDialog
        deployment={rollbackTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRollbackTarget(null);
          }
        }}
        organizationId={organizationId}
        siteId={siteId}
      />
    </div>
  );
}

function DeploymentActions({
  organizationId,
  siteId,
  deployment,
  live,
  primaryUrl,
  rollbackEntry,
  onRollback,
}: SiteDeploymentActionsProps) {
  const t = useTranslations("sites.deployments.actions");
  const tPage = useTranslations("sites.deploymentPage");
  const redeploy = useRedeployDeployment({ organizationId, siteId });
  const inProgress = isDeploymentInProgress(deployment.status);
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {rollbackEntry?.canRollback ? (
        <Button onClick={onRollback} variant="outline">
          <HugeiconsIcon
            aria-hidden="true"
            data-icon="inline-start"
            icon={ArrowTurnBackwardIcon}
            strokeWidth={1.5}
          />
          {t("rollback")}
        </Button>
      ) : null}
      {inProgress ? null : (
        <Button
          loading={redeploy.isPending}
          onClick={() => redeploy.mutate(deployment.id)}
          variant="outline"
        >
          <HugeiconsIcon
            aria-hidden="true"
            data-icon="inline-start"
            icon={RefreshIcon}
            strokeWidth={1.5}
          />
          {t("redeploy")}
        </Button>
      )}
      {live ? (
        <a
          className={buttonVariants()}
          href={primaryUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {tPage("visit")}
          <HugeiconsIcon
            aria-hidden="true"
            data-icon="inline-end"
            icon={ArrowUpRight01Icon}
            strokeWidth={1.5}
          />
        </a>
      ) : null}
    </div>
  );
}

function DeploymentNote({ deployment }: SiteDeploymentRecordProps) {
  const t = useTranslations("sites.deploymentPage.notice");
  if (
    deployment.status !== "canceled" &&
    deployment.status !== "superseded" &&
    deployment.status !== "expired"
  ) {
    return null;
  }
  return (
    <p
      className="text-muted-foreground flex items-start gap-1.5 text-sm text-pretty"
      role="status"
    >
      <HugeiconsIcon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0"
        icon={InformationCircleIcon}
        strokeWidth={1.5}
      />
      {t(deployment.status)}
    </p>
  );
}

function DeploymentDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-9 w-80 max-w-full" />
          <Skeleton className="h-5 w-64 max-w-full" />
        </div>
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
