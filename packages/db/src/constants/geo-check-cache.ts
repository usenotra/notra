/**
 * Cache policy for the GEO mention-check aggregates (overview, timeseries,
 * prompt summaries, language and competitor breakdowns).
 *
 * These queries scan a project's whole window on every dashboard render and
 * only change when a scan inserts new checks. Drizzle's auto-invalidation drops
 * every cached aggregate on each write to `geo_mention_checks`, so the TTL only
 * bounds staleness across writers that bypass Drizzle.
 */
const GEO_CHECK_AGGREGATE_TTL_SECONDS = 300;

export const GEO_CHECK_AGGREGATE_CACHE = {
  config: { ex: GEO_CHECK_AGGREGATE_TTL_SECONDS },
} as const;
