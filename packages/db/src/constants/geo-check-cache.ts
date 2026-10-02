/**
 * Cache policy for the GEO mention-check aggregates (overview, timeseries,
 * sentiment, prompt summaries, language and competitor breakdowns, persona
 * activity).
 *
 * These queries scan a project's whole window on every dashboard render and
 * tolerate up to five minutes of staleness. Disable table-wide invalidation so
 * a scan's writes do not evict cached aggregates for every tenant. Drizzle still
 * hashes the SQL and parameters, keeping tenants, projects and windows separate.
 * Fresh-data checks, such as sentiment analysis fingerprints, stay uncached.
 */
const GEO_CHECK_AGGREGATE_TTL_SECONDS = 300;

export const GEO_CHECK_AGGREGATE_CACHE = {
  autoInvalidate: false,
  config: { ex: GEO_CHECK_AGGREGATE_TTL_SECONDS },
} as const;
