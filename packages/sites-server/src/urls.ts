import type {
  SiteBuildTarget,
  SiteMounts,
} from "@notra/sites-core/types/deployment";
import { createDefaultSiteConfig } from "@notra/sites-core/utils/default-config";
import { siteAliasHost, sitePreviewHost } from "@notra/sites-core/utils/hosts";
import { listMountedAreas } from "@notra/sites-core/utils/mounts";

import {
  getDashboardUrl,
  getSitesHostingDomain,
  getSitesHostingPortSuffix,
  getSitesHostingProtocol,
} from "./env";
import type {
  BuildTargetForDeploymentParams,
  DeploymentDashboardUrlParams,
} from "./types/urls";

function hostingOrigin(host: string): string {
  return `${getSitesHostingProtocol()}://${host}${getSitesHostingPortSuffix()}`;
}

export function siteAliasOrigin(slug: string): string {
  return hostingOrigin(siteAliasHost(slug, getSitesHostingDomain()));
}

export function sitePreviewOrigin(slug: string, previewKey: string): string {
  return hostingOrigin(
    sitePreviewHost(previewKey, slug, getSitesHostingDomain())
  );
}

export function primaryMountUrl(origin: string, mounts: SiteMounts): string {
  const first = listMountedAreas(mounts)[0];
  return `${origin}${first && first.mount !== "/" ? first.mount : "/"}`;
}

export function buildTargetForDeployment({
  site,
  kind,
  previewKey,
}: BuildTargetForDeploymentParams): SiteBuildTarget {
  const previewOrigin =
    kind === "preview" && previewKey
      ? sitePreviewOrigin(site.slug, previewKey)
      : null;
  return {
    publicOrigin: previewOrigin ?? site.publicOrigin,
    mounts: site.mounts,
    noindex: previewOrigin !== null,
    branding: site.showBranding,
    defaultConfig: createDefaultSiteConfig(site.name),
  };
}

export function deploymentDashboardUrl(
  params: DeploymentDashboardUrlParams
): string {
  return `${getDashboardUrl()}/${params.organizationSlug}/sites/${params.siteId}/deployments/${params.deploymentId}`;
}
