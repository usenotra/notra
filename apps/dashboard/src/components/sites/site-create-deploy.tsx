"use client";

import {
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  MultiplicationSignCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { buttonVariants } from "@/components/button";
import Link from "@/components/framework/link";
import { SiteBuildLogs } from "@/components/sites/site-build-logs";
import {
  SITE_CONFIG_MISSING_DIAGNOSTIC,
  SITE_CREATE_DEPLOY_POLL_MS,
} from "@/constants/site-create";
import { useNow } from "@/lib/hooks/use-now";
import { useSiteDeployment } from "@/lib/hooks/use-site-deployments";
import { dashboardOrpc } from "@/lib/orpc/query";
import { cn } from "@/lib/utils";
import type { SiteCreateDeployProps } from "@/types/components/sites";
import {
  deploymentElapsedMs,
  formatBuildDuration,
  isDeploymentInProgress,
} from "@/utils/site-deployments";
import { siteDeploymentHref, siteHref } from "@/utils/site-links";

export function SiteCreateDeploy({
  organizationId,
  organizationSlug,
  site,
  deploymentQueued,
  starterPullRequestUrl = null,
}: SiteCreateDeployProps) {
  const t = useTranslations("sites.new.deploy");
  const detail = useQuery(
    dashboardOrpc.sites.get.queryOptions({
      input: { organizationId, siteId: site.id },
      refetchInterval: (query) =>
        !deploymentQueued || query.state.data?.deployments[0]
          ? false
          : SITE_CREATE_DEPLOY_POLL_MS,
    })
  );
  const deploymentId = detail.data?.deployments[0]?.id ?? "";
  const deployment = useSiteDeployment({
    organizationId: deploymentId ? organizationId : "",
    siteId: site.id,
    deploymentId,
  });
  const record = deployment.data?.deployment ?? null;
  const status = record?.status ?? "queued";
  const inProgress = isDeploymentInProgress(status);
  const failed =
    !deploymentQueued || status === "failed" || status === "canceled";
  const ready = record !== null && !(inProgress || failed);
  const awaitsStarterMerge =
    failed &&
    starterPullRequestUrl !== null &&
    (record?.diagnostics ?? []).some(
      (diagnostic) => diagnostic.code === SITE_CONFIG_MISSING_DIAGNOSTIC
    );
  const now = useNow(inProgress);
  const elapsed = record
    ? formatBuildDuration(deploymentElapsedMs(record, now))
    : null;
  const startedSeconds = record
    ? Math.max(
        0,
        Math.round((now - new Date(record.createdAt).getTime()) / 1000)
      )
    : 0;

  let headline = t("waiting");
  if (record && inProgress) {
    headline = t("started", { seconds: startedSeconds });
  } else if (ready) {
    headline = t("ready", { duration: elapsed ?? "" });
  } else if (!deploymentQueued) {
    headline = t("notStarted");
  } else if (failed) {
    headline = t("failed");
  }

  let icon = Loading03Icon;
  if (ready) {
    icon = CheckmarkCircle02Icon;
  } else if (failed) {
    icon = MultiplicationSignCircleIcon;
  }

  return (
    <div className="space-y-4">
      <p
        aria-live="polite"
        className={cn(
          "flex items-center gap-2 text-sm",
          ready && "text-success",
          failed && "text-destructive",
          !(ready || failed) && "text-muted-foreground"
        )}
      >
        <HugeiconsIcon
          aria-hidden="true"
          className={cn(
            "size-4",
            !(ready || failed) && "motion-safe:animate-spin"
          )}
          icon={icon}
          strokeWidth={1.75}
        />
        {headline}
      </p>

      {awaitsStarterMerge ? (
        <p className="animate-in fade-in text-sm duration-300">
          {t("mergeStarter")}{" "}
          <a
            className="text-primary inline-flex items-center gap-0.5 underline-offset-4 hover:underline"
            href={starterPullRequestUrl ?? undefined}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("viewPullRequest")}
            <HugeiconsIcon
              aria-hidden="true"
              className="size-3.5"
              icon={ArrowUpRight01Icon}
            />
          </a>
        </p>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-xl border",
          !deploymentQueued && "hidden"
        )}
      >
        <div className="h-80">
          <SiteBuildLogs
            inProgress={inProgress}
            log={deployment.data?.log ?? null}
            queued={!record || status === "queued"}
          />
        </div>
      </div>

      {ready || failed ? (
        <div className="animate-in fade-in motion-safe:slide-in-from-bottom-1 flex flex-wrap justify-end gap-2 duration-300">
          {failed && deploymentId ? (
            <Link
              className={buttonVariants({ variant: "outline" })}
              href={siteDeploymentHref(organizationSlug, site.id, deploymentId)}
            >
              {t("viewDeployment")}
            </Link>
          ) : null}
          {ready ? (
            <a
              className={buttonVariants({ variant: "outline" })}
              href={site.liveUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t("visit")}
              <HugeiconsIcon data-icon="inline-end" icon={ArrowUpRight01Icon} />
            </a>
          ) : null}
          <Link
            className={buttonVariants()}
            href={siteHref(organizationSlug, site.id)}
          >
            {t("openSite")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
