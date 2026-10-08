"use client";

import {
  ArrowUpRight01Icon,
  GitBranchIcon,
  GitCommitIcon,
  GitPullRequestIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { TABLE_FRAME_CLASS } from "@notra/ui/constants/table";
import { useLocale, useTranslations } from "use-intl";

import { SiteEnvironmentBadge } from "@/components/sites/site-environment-badge";
import { SitePreviewFrame } from "@/components/sites/site-preview-frame";
import { SiteRelativeTime } from "@/components/sites/site-relative-time";
import { SiteStatusDot } from "@/components/sites/site-status-dot";
import { SITE_DEPLOYMENT_SUMMARY_SURFACE_CLASS } from "@/constants/sites";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";
import type {
  SiteDeploymentExternalLinkProps,
  SiteDeploymentFactProps,
  SiteDeploymentSummaryProps,
} from "@/types/components/sites";
import { formatBytes } from "@/utils/format";
import {
  deploymentElapsedMs,
  formatBuildDuration,
  isDeploymentInProgress,
  isDeploymentProtected,
  shortSha,
} from "@/utils/site-deployments";
import {
  displayUrl,
  githubBranchUrl,
  githubCommitUrl,
  githubPullRequestUrl,
} from "@/utils/site-links";

function Fact({ label, children }: SiteDeploymentFactProps) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

function ExternalLink({
  href,
  children,
  mono = false,
}: SiteDeploymentExternalLinkProps) {
  const className = mono ? "font-mono text-xs" : undefined;
  if (!href) {
    return <span className={className}>{children}</span>;
  }
  return (
    <a
      className={cn(
        className,
        "decoration-foreground/25 hover:decoration-foreground underline underline-offset-4 transition-colors duration-150"
      )}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

export function SiteDeploymentSummary({
  detail,
  deployment,
  live,
  urls,
  primaryUrl,
}: SiteDeploymentSummaryProps) {
  const t = useTranslations("sites.deploymentPage");
  const locale = useLocale();
  const inProgress = isDeploymentInProgress(deployment.status);
  const now = useNow(inProgress);
  const duration =
    deployment.status === "ready" || inProgress
      ? formatBuildDuration(deploymentElapsedMs(deployment, now))
      : null;
  const repository = detail.site.repository;
  const branchUrl = githubBranchUrl(repository, deployment.branch);
  const protectedPreview = isDeploymentProtected(deployment, detail);

  let fallback = t("preview.notLive");
  if (inProgress) {
    fallback = t("preview.building");
  } else if (deployment.status === "failed") {
    fallback = t("preview.failed");
  } else if (deployment.status === "expired") {
    fallback = t("preview.expired");
  } else if (protectedPreview) {
    fallback = t("preview.protected");
  }

  let output = inProgress ? t("output.pending") : "–";
  if (deployment.fileCount !== null) {
    output =
      deployment.fileCount === 0
        ? t("output.none")
        : `${t("output.fileCount", { count: deployment.fileCount })}${
            deployment.totalBytes === null
              ? ""
              : ` · ${formatBytes(deployment.totalBytes, locale)}`
          }`;
  }

  const created = new Date(deployment.createdAt);

  return (
    <div className={TABLE_FRAME_CLASS}>
      <div className={SITE_DEPLOYMENT_SUMMARY_SURFACE_CLASS}>
        <SitePreviewFrame
          className="aspect-[16/10] w-full rounded-lg border"
          fallback={
            <p className="text-muted-foreground px-6 text-center text-sm text-pretty">
              {fallback}
            </p>
          }
          url={live && !protectedPreview ? primaryUrl : null}
        />
        <dl className="grid content-center gap-x-8 gap-y-5 sm:grid-cols-2">
          <Fact label={t("fields.status")}>
            <SiteStatusDot
              duration={duration}
              live={live}
              status={deployment.status}
            />
          </Fact>
          <Fact label={t("fields.environment")}>
            <SiteEnvironmentBadge
              kind={deployment.kind}
              live={live}
              previewKey={deployment.previewKey}
            />
          </Fact>
          <Fact label={t("fields.domains")}>
            <span className="flex min-w-0 flex-col gap-1">
              {urls.map((url) =>
                live ? (
                  <a
                    className="group inline-flex min-w-0 items-center gap-1"
                    href={url}
                    key={url}
                    rel="noopener noreferrer"
                    target="_blank"
                    title={url}
                  >
                    <span className="truncate underline-offset-4 group-hover:underline">
                      {displayUrl(url)}
                    </span>
                    <HugeiconsIcon
                      aria-hidden="true"
                      className="text-muted-foreground size-3.5 shrink-0"
                      icon={ArrowUpRight01Icon}
                      strokeWidth={1.5}
                    />
                  </a>
                ) : (
                  <span
                    className="text-muted-foreground truncate"
                    key={url}
                    title={url}
                  >
                    {displayUrl(url)}
                  </span>
                )
              )}
              {live ? null : (
                <span className="text-muted-foreground text-xs">
                  {t("notLive")}
                </span>
              )}
            </span>
          </Fact>
          <Fact label={t("fields.source")}>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex min-w-0 items-center gap-1.5">
                <HugeiconsIcon
                  aria-hidden="true"
                  className="text-muted-foreground size-3.5 shrink-0"
                  icon={GitBranchIcon}
                  strokeWidth={1.5}
                />
                <span className="truncate">
                  <ExternalLink href={branchUrl} mono>
                    {deployment.branch}
                  </ExternalLink>
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <HugeiconsIcon
                  aria-hidden="true"
                  className="text-muted-foreground size-3.5 shrink-0"
                  icon={GitCommitIcon}
                  strokeWidth={1.5}
                />
                <ExternalLink
                  href={githubCommitUrl(repository, deployment.commitSha)}
                  mono
                >
                  {shortSha(deployment.commitSha)}
                </ExternalLink>
                {deployment.pullRequestNumber ? (
                  <>
                    <HugeiconsIcon
                      aria-hidden="true"
                      className="text-muted-foreground ms-2 size-3.5 shrink-0"
                      icon={GitPullRequestIcon}
                      strokeWidth={1.5}
                    />
                    <ExternalLink
                      href={githubPullRequestUrl(
                        repository,
                        deployment.pullRequestNumber
                      )}
                      mono
                    >
                      {t("pullRequest", {
                        number: deployment.pullRequestNumber,
                      })}
                    </ExternalLink>
                  </>
                ) : null}
              </span>
            </span>
          </Fact>
          <Fact label={t("output.title")}>{output}</Fact>
          <Fact label={t("fields.created")}>
            <time
              dateTime={created.toISOString()}
              title={created.toLocaleString(locale, {
                dateStyle: "medium",
                timeStyle: "medium",
              })}
            >
              <SiteRelativeTime date={deployment.createdAt} inline />
            </time>
          </Fact>
        </dl>
      </div>
    </div>
  );
}
