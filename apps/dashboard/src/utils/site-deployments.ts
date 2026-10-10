import {
  MS_PER_SECOND,
  ESCAPE,
  ANSI_SEQUENCE,
  SECONDS_PER_MINUTE,
} from "@/constants/site-deployments";
import {
  SITE_DEPLOYMENT_ENVIRONMENT_FILTERS,
  SITE_DEPLOYMENT_IN_PROGRESS_STATUSES,
  SITE_DEPLOYMENT_STATUS_FILTERS,
  SITE_SHORT_SHA_LENGTH,
} from "@/constants/sites";
import type {
  SiteDeployment,
  SiteDeploymentEnvironmentFilter,
  SiteDeploymentFilters,
  SiteDeploymentRecord,
  SiteDeploymentStatus,
  SiteDeploymentStatusFilter,
  SiteDetail,
} from "@/types/sites";
import { hostFromOrigin } from "@/utils/site-links";

export function isDeploymentInProgress(status: SiteDeploymentStatus): boolean {
  return SITE_DEPLOYMENT_IN_PROGRESS_STATUSES.has(status);
}

export function hasDeploymentInProgress(
  deployments: readonly Pick<SiteDeployment, "status">[]
): boolean {
  return deployments.some((deployment) =>
    isDeploymentInProgress(deployment.status)
  );
}

const SITE_LIST_ATTENTION_STATUSES: ReadonlySet<SiteDeploymentStatus> = new Set(
  ["queued", "building", "uploading", "failed"]
);

/**
 * The list shows the state of the site, not of its newest production
 * deployment: a skipped, superseded or canceled one leaves the previous one
 * serving, so the site is still live.
 */
export function siteListStatus(site: {
  liveDeploymentId: string | null;
  liveSince: Date | string | null;
  latestDeployment: {
    id: string;
    status: SiteDeploymentStatus;
    live: boolean;
    createdAt: Date | string;
  } | null;
}): {
  status: SiteDeploymentStatus;
  live: boolean;
  at: Date | string;
} | null {
  const latest = site.latestDeployment;
  if (!latest) {
    return null;
  }
  const servedByOlderDeployment =
    site.liveDeploymentId !== null &&
    latest.id !== site.liveDeploymentId &&
    !SITE_LIST_ATTENTION_STATUSES.has(latest.status);
  if (servedByOlderDeployment) {
    return {
      status: "ready",
      live: true,
      at: site.liveSince ?? latest.createdAt,
    };
  }
  return { status: latest.status, live: latest.live, at: latest.createdAt };
}

export function stripAnsi(text: string): string {
  return text.replace(ANSI_SEQUENCE, "");
}

export function shortSha(sha: string): string {
  return sha.slice(0, SITE_SHORT_SHA_LENGTH);
}

export function commitTitle(message: string | null): string | null {
  const title = message?.split("\n", 1)[0]?.trim();
  return title ? title : null;
}

export function formatBuildDuration(ms: number | null): string | null {
  if (ms === null || ms < 0) {
    return null;
  }
  const totalSeconds = Math.max(1, Math.round(ms / MS_PER_SECOND));
  if (totalSeconds < SECONDS_PER_MINUTE) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

export function deploymentElapsedMs(
  deployment: Pick<
    SiteDeployment,
    "buildDurationMs" | "startedAt" | "finishedAt" | "createdAt"
  >,
  now = Date.now()
): number | null {
  if (deployment.buildDurationMs !== null) {
    return deployment.buildDurationMs;
  }
  const start = deployment.startedAt ?? deployment.createdAt;
  const end = deployment.finishedAt ? deployment.finishedAt.getTime() : now;
  return end - new Date(start).getTime();
}

export function isDeploymentLive(
  deployment: SiteDeploymentRecord,
  detail: SiteDetail
): boolean {
  if (deployment.kind === "production") {
    return detail.site.liveDeploymentId === deployment.id;
  }
  return detail.previews.some(
    (preview) => preview.deploymentId === deployment.id
  );
}

export function pendingProductionDeployment(
  detail: SiteDetail,
  liveDeployment: SiteDeployment | null
): SiteDeployment | null {
  const latest =
    detail.deployments.find((deployment) => deployment.kind === "production") ??
    null;
  if (!latest || latest.id === liveDeployment?.id) {
    return null;
  }
  return isDeploymentInProgress(latest.status) || latest.status === "failed"
    ? latest
    : null;
}

export function isDeploymentProtected(
  deployment: SiteDeploymentRecord,
  detail: SiteDetail
): boolean {
  const visibility =
    detail.previews.find((preview) => preview.deploymentId === deployment.id)
      ?.visibility ?? detail.site.previewVisibility;
  return deployment.kind === "preview" && visibility !== "public";
}

export function deploymentServedUrls(
  deployment: SiteDeploymentRecord,
  detail: SiteDetail,
  live: boolean
): string[] {
  if (!(live && deployment.kind === "production")) {
    return [deployment.url];
  }
  const urls = [detail.site.liveUrl];
  const hosts = new Set([hostFromOrigin(detail.site.liveUrl)]);
  const candidates = [
    ...detail.domains
      .filter((domain) => domain.status === "active")
      .map((domain) => `https://${domain.hostname}`),
    detail.site.aliasOrigin,
  ];
  for (const url of candidates) {
    const host = hostFromOrigin(url);
    if (!hosts.has(host)) {
      hosts.add(host);
      urls.push(url);
    }
  }
  return urls;
}

function deploymentMatchesStatus(
  deployment: SiteDeployment,
  filter: SiteDeploymentStatusFilter | "all"
): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "building") {
    return (
      deployment.status === "building" || deployment.status === "uploading"
    );
  }
  return deployment.status === filter;
}

export function deploymentMatchesFilters(
  deployment: SiteDeployment,
  filters: SiteDeploymentFilters
): boolean {
  const environmentOk =
    filters.environment === "all" || filters.environment === deployment.kind;
  return environmentOk && deploymentMatchesStatus(deployment, filters.status);
}

export function deploymentMatchesSearch(
  deployment: Pick<
    SiteDeployment,
    "branch" | "commitSha" | "commitMessage" | "previewKey"
  >,
  search: string
): boolean {
  const query = search.trim().toLocaleLowerCase();
  return (
    !query ||
    [
      deployment.branch,
      deployment.commitSha,
      deployment.commitMessage,
      deployment.previewKey,
    ].some((value) => value?.toLocaleLowerCase().includes(query))
  );
}

export function isDeploymentEnvironmentFilter(
  value: string | null
): value is SiteDeploymentEnvironmentFilter {
  return SITE_DEPLOYMENT_ENVIRONMENT_FILTERS.some((option) => option === value);
}

export function isDeploymentStatusFilter(
  value: string | null
): value is SiteDeploymentStatusFilter | "all" {
  return SITE_DEPLOYMENT_STATUS_FILTERS.some((option) => option === value);
}
