import type { SiteMounts } from "@notra/sites-core/types/deployment";

export interface BuildTargetForDeploymentParams {
  site: {
    name: string;
    slug: string;
    publicOrigin: string;
    mounts: SiteMounts;
    showBranding: boolean;
  };
  kind: "production" | "preview";
  previewKey: string | null;
}

export interface DeploymentDashboardUrlParams {
  organizationSlug: string;
  siteId: string;
  deploymentId: string;
}
