import type { SiteArea } from "@notra/sites-core/types/deployment";
import type { SiteConfig } from "@notra/sites-core/types/site-config";

import { AREA_DEFAULT_TITLES } from "../constants/areas";

export function configuredAreaTitle(
  config: SiteConfig,
  area: SiteArea
): string {
  return config[area]?.title ?? AREA_DEFAULT_TITLES[area];
}

export function withSiteName(
  siteName: string,
  title: string,
  separator = " "
): string {
  return title.startsWith(siteName) ? title : `${siteName}${separator}${title}`;
}
