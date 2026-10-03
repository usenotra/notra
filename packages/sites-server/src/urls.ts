import type {
  SiteBuildTarget,
  SiteMounts,
} from "@notra/sites-core/schemas/deployment";
import { siteAliasHost, sitePreviewHost } from "@notra/sites-core/utils/hosts";
import { listMountedAreas } from "@notra/sites-core/utils/mounts";

import {
  getDashboardUrl,
  getSitesHostingDomain,
  getSitesHostingPortSuffix,
  getSitesHostingProtocol,
} from "./env";

export function siteAliasOrigin(slug: string): string {
  return `${getSitesHostingProtocol()}://${siteAliasHost(slug, getSitesHostingDomain())}${getSitesHostingPortSuffix()}`;
}

export function sitePreviewOrigin(slug: string, previewKey: string): string {
  return `${getSitesHostingProtocol()}://${sitePreviewHost(previewKey, slug, getSitesHostingDomain())}${getSitesHostingPortSuffix()}`;
}

/** The first mounted area is the landing URL (`/blog` if both exist). */
export function primaryMountUrl(origin: string, mounts: SiteMounts): string {
  const first = listMountedAreas(mounts)[0];
  return `${origin}${first && first.mount !== "/" ? first.mount : "/"}`;
}

export function buildTargetForDeployment(params: {
  site: { slug: string; publicOrigin: string; mounts: SiteMounts };
  kind: "production" | "preview";
  previewKey: string | null;
}): SiteBuildTarget {
  if (params.kind === "preview" && params.previewKey) {
    return {
      publicOrigin: sitePreviewOrigin(params.site.slug, params.previewKey),
      mounts: params.site.mounts,
      noindex: true,
    };
  }
  return {
    publicOrigin: params.site.publicOrigin,
    mounts: params.site.mounts,
    noindex: false,
  };
}

export function deploymentDashboardUrl(params: {
  organizationSlug: string;
  siteId: string;
  deploymentId: string;
}): string {
  return `${getDashboardUrl()}/${params.organizationSlug}/sites/${params.siteId}/deployments/${params.deploymentId}`;
}
