import type { SiteMounts } from "@notra/sites-core/types/deployment";
import type { SiteConfig } from "@notra/sites-core/types/site-config";
import type { SiteHeadScript } from "@notra/sites-core/types/site-integrations";

export interface BuildParams {
  area: "blog" | "changelog";
  mount: string;
  publicOrigin: string;
  siteId: string;
  deploymentId: string;
  noindex: boolean;
  includeDrafts: boolean;
  branding: boolean;
  workDir: string;
  publicFiles: string[];
  mounts: SiteMounts;
  config: SiteConfig;
  headScripts: SiteHeadScript[];
  hasReactComponents: boolean;
}
