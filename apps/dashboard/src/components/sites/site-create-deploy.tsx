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
import { CopyPromptButton } from "@/components/geo/code-snippet";
import { SiteBuildLogs } from "@/components/sites/site-build-logs";
import {
  SITE_CONFIG_MISSING_DIAGNOSTIC,
  SITE_CREATE_DEPLOY_POLL_MS,
} from "@/constants/site-create";
import { MS_PER_SECOND } from "@/constants/site-deployments";
import { useNow } from "@/lib/hooks/use-now";
import { useSiteDeployment } from "@/lib/hooks/use-site-deployments";
import { dashboardOrpc } from "@/lib/orpc/query";
import { cn } from "@/lib/utils";
import type { SiteCreateDeployProps } from "@/types/components/sites";
import { buildSiteBuildAgentPrompt } from "@/utils/site-build-agent-prompt";
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
  const inProgress = deploymentQueued && isDeploymentInProgress(status);
  const failed =
    !deploymentQueued || status === "failed" || status === "canceled";
  const ready = record !== null && !(inProgress || failed);
  const configMissing =
    failed &&
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
        Math.round((now - new Date(record.createdAt).getTime()) / MS_PER_SECOND)
      )
    : 0;

  let headline = t("waiting");
  if (!deploymentQueued) {
    headline = t("notStarted");
  } else if (record && inProgress) {
    headline = t("started", { seconds: startedSeconds });
  } else if (ready) {
    headline = t("ready", { duration: elapsed ?? "" });
  } else if (failed) {
    headline = t("failed");
  }

  let icon = Loading03Icon;
  if (ready) {
    icon = CheckmarkCircle02Icon;
  } else if (failed) {
    icon = MultiplicationSignCircleIcon;
  }

  const heading = (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2",
        ready && "text-success",
        failed && "text-destructive",
        !(ready || failed) && "text-muted-foreground"
      )}
    >
      <HugeiconsIcon
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0",
          !(ready || failed) && "motion-safe:animate-spin"
        )}
        icon={icon}
        strokeWidth={1.75}
      />
      {headline}
    </span>
  );

  return (
    <div className="space-y-4">
      {deploymentQueued ? (
        <div className="overflow-hidden rounded-xl border">
          <SiteBuildLogs
            heading={heading}
            inProgress={inProgress}
            log={deployment.data?.log ?? null}
            queued={!record || status === "queued"}
          />
        </div>
      ) : (
        <div className="text-sm">{heading}</div>
      )}

      {configMissing ? (
        <p className="animate-in fade-in text-sm duration-300">
          {t("configMissingRetry")}
          {starterPullRequestUrl ? (
            <>
              {" "}
              <a
                className="text-primary inline-flex items-center gap-0.5 underline-offset-4 hover:underline"
                href={starterPullRequestUrl}
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
            </>
          ) : null}
        </p>
      ) : null}

      {ready || failed ? (
        <div className="animate-in fade-in motion-safe:slide-in-from-bottom-1 flex flex-wrap items-center justify-end gap-2 duration-300">
          {failed ? (
            <>
              <CopyPromptButton
                className="me-auto"
                prompt={buildSiteBuildAgentPrompt({
                  site,
                  deployment: record,
                  log: deployment.data?.log ?? null,
                })}
              />
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href={
                  deploymentId
                    ? siteDeploymentHref(
                        organizationSlug,
                        site.id,
                        deploymentId
                      )
                    : siteHref(organizationSlug, site.id, "deployments")
                }
              >
                {t("viewDeployment")}
              </Link>
            </>
          ) : (
            <>
              <a
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href={site.liveUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {t("visit")}
                <HugeiconsIcon
                  data-icon="inline-end"
                  icon={ArrowUpRight01Icon}
                />
              </a>
              <Link
                className={buttonVariants({ size: "sm" })}
                href={siteHref(organizationSlug, site.id)}
              >
                {t("openSite")}
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
