import { SITE_SECTIONS } from "@/constants/sites";
import type { SiteRepositoryRef, SiteSection } from "@/types/sites";

export function siteHref(
  organizationSlug: string,
  siteId: string,
  section: SiteSection = "overview"
): string {
  const path =
    SITE_SECTIONS.find((candidate) => candidate.section === section)?.path ??
    "";
  return `/${organizationSlug}/sites/${siteId}${path}`;
}

export function siteDeploymentHref(
  organizationSlug: string,
  siteId: string,
  deploymentId: string
): string {
  return `${siteHref(organizationSlug, siteId, "deployments")}/${deploymentId}`;
}

export function sitePreviewDeploymentsHref(
  organizationSlug: string,
  siteId: string
): string {
  return `${siteHref(organizationSlug, siteId, "deployments")}?environment=preview`;
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function hostFromOrigin(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return displayUrl(origin);
  }
}

export function githubRepositoryUrl(repository: SiteRepositoryRef): string {
  return `https://github.com/${repository.owner}/${repository.name}`;
}

export function githubBranchUrl(
  repository: SiteRepositoryRef | null,
  branch: string
): string | null {
  if (!repository) {
    return null;
  }
  return `https://github.com/${repository.owner}/${repository.name}/tree/${branch}`;
}

export function githubCommitUrl(
  repository: SiteRepositoryRef | null,
  sha: string
): string | null {
  if (!repository) {
    return null;
  }
  return `https://github.com/${repository.owner}/${repository.name}/commit/${sha}`;
}

export function githubPullRequestUrl(
  repository: SiteRepositoryRef | null,
  pullRequestNumber: number | null
): string | null {
  if (!(repository && pullRequestNumber)) {
    return null;
  }
  return `https://github.com/${repository.owner}/${repository.name}/pull/${pullRequestNumber}`;
}

export function siteUrlOnOrigin(origin: string, liveUrl: string): string {
  const base = origin.replace(/\/$/, "");
  try {
    return `${base}${new URL(liveUrl).pathname.replace(/\/$/, "")}`;
  } catch {
    return base;
  }
}
