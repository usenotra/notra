import { createDefaultSiteConfig } from "@notra/sites-core/utils/default-config";

import type { Site } from "../types/sites";

export function defaultSiteConfigContent(site: Pick<Site, "name">): string {
  return `${JSON.stringify(createDefaultSiteConfig(site.name), null, 2)}\n`;
}
