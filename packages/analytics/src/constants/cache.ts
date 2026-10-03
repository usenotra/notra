export const QUERY_CACHE_KEY_PREFIX = "tb:q";
export const VERSION_KEY_PREFIX = "tb:ver";
export const PURGE_GENERATION_KEY_PREFIX = "tb:purgegen";
export const QUERY_CACHE_TTL_SECONDS = 21_600;
export const LIVE_QUERY_CACHE_TTL_SECONDS = 30;

/**
 * The geo ingest service writes traffic to Tinybird in batches on these
 * wall-clock boundaries (:00, :05, …), so live entries are kept until the
 * next one: polling reaches Tinybird once per window, in the minute the batch
 * landed, instead of keeping it active every minute. Organizations with an
 * open live view are written early, and that announcement bumps their purge
 * generation, so they never wait for the window.
 */
export const GEO_TRAFFIC_FLUSH_INTERVAL_MS = 5 * 60 * 1000;
// Overrides the window for both the ingest service and the cache, so it must
// be set on both; `0` means per-event writes and the plain live TTL.
export const GEO_TRAFFIC_FLUSH_INTERVAL_ENV = "GEO_INGEST_FLUSH_INTERVAL_MS";
// Time for a flush (write timeout plus Tinybird's buffer) to become readable
// before entries for the new window are cached.
export const GEO_TRAFFIC_FLUSH_SETTLE_MS = 20_000;
export const GLOBAL_SCOPE_ID = "global";
export const INITIAL_CACHE_VERSION = 0;

/**
 * Versioned scopes are invalidated by `bumpAnalyticsVersions` on ingest.
 * Live scopes ingest per event, so a version bump per event would invalidate
 * every cached query before it is ever read — they expire on a short TTL
 * (aligned to the flush window for geo) and skip the version read/write
 * entirely.
 */
export const VERSIONED_CACHE_SCOPES = new Set(["social"]);

export const EXTERNAL_CACHE_TTL_SECONDS = 43_200;
export const EXTERNAL_CACHE_KEY_PREFIX = "tb:ext";
