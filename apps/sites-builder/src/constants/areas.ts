import type { SiteArea } from "@notra/sites-core/types/deployment";

export const THEME_AREAS = [
  "blog",
  "changelog",
] as const satisfies readonly SiteArea[];

export const AREA_DEFAULT_TITLES: Record<SiteArea, string> = {
  blog: "Blog",
  changelog: "Changelog",
};
