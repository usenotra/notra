export const GITHUB_APP_REPOSITORIES_CACHE_TTL_SECONDS = 15 * 60;
// ponytail: one stale copy per installation. Drop it when a missed permission change has to show up during a GitHub outage.
export const GITHUB_APP_REPOSITORIES_STALE_CACHE_TTL_SECONDS = 24 * 60 * 60;
