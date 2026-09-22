export const QUERY_CACHE_KEY_PREFIX = "tb:q";
export const VERSION_KEY_PREFIX = "tb:ver";
export const PURGE_GENERATION_KEY_PREFIX = "tb:purgegen";
export const QUERY_CACHE_TTL_SECONDS = 21_600;
export const LIVE_QUERY_CACHE_TTL_SECONDS = 30;
export const GLOBAL_SCOPE_ID = "global";
export const INITIAL_CACHE_VERSION = 0;

/**
 * Versioned scopes are invalidated by `bumpAnalyticsVersions` on ingest.
 * Live scopes ingest per event, so a version bump per event would invalidate
 * every cached query before it is ever read — they expire on a short TTL
 * instead and skip the version read/write entirely.
 */
export const VERSIONED_CACHE_SCOPES = new Set(["social"]);

export const EXTERNAL_CACHE_TTL_SECONDS = 43_200;
export const EXTERNAL_CACHE_KEY_PREFIX = "tb:ext";
