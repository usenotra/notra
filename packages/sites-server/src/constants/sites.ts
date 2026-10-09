import type { SiteMounts } from "@notra/sites-core/types/deployment";

export const DEFAULT_SITE_MOUNTS: SiteMounts = {
  blog: "/blog",
  changelog: "/changelog",
};
export const SITE_SLUG_ATTEMPTS = 20;
/** Room for the "site-" prefix when a name slugifies to an invalid slug. */
export const SITE_SLUG_FALLBACK_MAX_LENGTH = 32;
/** Retries append "-" and a random suffix, staying within the slug limit. */
export const SITE_SLUG_RETRY_ROOT_MAX_LENGTH = 34;
export const SITE_SLUG_RETRY_SUFFIX_LENGTH = 4;
