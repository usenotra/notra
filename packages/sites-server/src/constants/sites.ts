import type { SiteMounts } from "@notra/sites-core/types/deployment";

export const DEFAULT_SITE_MOUNTS: SiteMounts = {
  blog: "/blog",
  changelog: "/changelog",
};
export const SITE_SLUG_ATTEMPTS = 20;
