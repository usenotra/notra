import { SITE_ASSETS_DIR } from "@notra/sites-core/constants/sites";
import type { SiteConfig } from "@notra/sites-core/types/site-config";
import type { SiteHeadScript } from "@notra/sites-core/types/site-integrations";
import { integrationHeadScripts } from "@notra/sites-core/utils/integrations";
import { joinMountPath } from "@notra/sites-core/utils/mounts";

export function siteHeadScripts(
  config: SiteConfig,
  mount: string,
  customScripts: readonly string[]
): SiteHeadScript[] {
  return [
    ...integrationHeadScripts(config.integrations),
    ...customScripts.map((fileName): SiteHeadScript => ({
      kind: "external",
      src: joinMountPath(mount, `${SITE_ASSETS_DIR}/${fileName}`),
      attributes: { defer: true },
    })),
  ];
}
