/**
 * Cache policy for the GEO mention-check aggregates (overview, timeseries,
 * sentiment, prompt summaries, language and competitor breakdowns, persona
 * activity).
 *
 * These queries scan a project's whole window on every dashboard render.
 * Table-wide invalidation stays off so a scan's writes do not evict cached
 * aggregates for every tenant. Instead every entry is keyed by its
 * organization's check generation, which `insertGeoMentionChecks` bumps, so
 * new checks are readable right away and the TTL only bounds memory.
 */
const GEO_CHECK_AGGREGATE_TTL_SECONDS = 300;

export const GEO_CHECK_AGGREGATE_CACHE = {
  autoInvalidate: false,
  config: { ex: GEO_CHECK_AGGREGATE_TTL_SECONDS },
} as const;

export const GEO_CHECK_GENERATION_KEY_PREFIX = "geo:checkgen";
export const GEO_CHECK_AGGREGATE_TAG_PREFIX = "geo:checkagg";
// Outlives every cached entry by far: an expired generation restarts at 0,
// which must not revive entries written under an earlier 0.
export const GEO_CHECK_GENERATION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const INITIAL_GEO_CHECK_GENERATION = 0;
