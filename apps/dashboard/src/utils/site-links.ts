import { SITE_SECTIONS } from "@/constants/sites";
import type { SiteSection } from "@/types/sites";

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

export function githubCommitUrl(
  repository: { owner: string; name: string } | null,
  sha: string
): string | null {
  if (!repository) {
    return null;
  }
  return `https://github.com/${repository.owner}/${repository.name}/commit/${sha}`;
}

export function githubPullRequestUrl(
  repository: { owner: string; name: string } | null,
  pullRequestNumber: number | null
): string | null {
  if (!(repository && pullRequestNumber)) {
    return null;
  }
  return `https://github.com/${repository.owner}/${repository.name}/pull/${pullRequestNumber}`;
}

/** The live URL's path (a mount such as /blog) on another origin of the same site. */
export function siteUrlOnOrigin(origin: string, liveUrl: string): string {
  let path = "";
  try {
    path = new URL(liveUrl).pathname.replace(/\/$/, "");
  } catch {
    path = "";
  }
  return `${origin.replace(/\/$/, "")}${path}`;
}
