export const GEO_INGEST_FIRST_HIT_KEY_PREFIX = "geo:ingest-first-hit:v1";
export const GEO_INGEST_RECEIVED_SAMPLE_RATE = 0.01;
export const GEO_INGEST_RECEIVED_SAMPLE_DENOMINATOR = 100;
// Dropped (human/unknown) traffic outnumbers stored events by an order of
// magnitude; log a sample so drop reasons stay visible without paying for a
// log line per page view. Each sampled line carries `weight` so Axiom totals
// can be scaled back up with sum(weight).
export const GEO_INGEST_DROPPED_LOG_SAMPLE_RATE = 0.05;
export const GEO_INGEST_ERROR_MESSAGE_MAX_LENGTH = 200;
// The SDK aborts its send after 2 s and never retries. Bounding upstream calls
// keeps a Redis or Tinybird stall from piling up open requests.
export const GEO_INGEST_RATELIMIT_TIMEOUT_MS = 1000;
export const GEO_INGEST_REDIS_RETRIES = 1;
export const GEO_INGEST_TINYBIRD_TIMEOUT_MS = 5000;
// Client timestamps outside this window are replaced with the receive time so
// a skewed or forged clock cannot backdate stats or land outside ClickHouse's
// DateTime range.
export const GEO_INGEST_MAX_CLOCK_SKEW_FUTURE_MS = 5 * 60 * 1000;
export const GEO_INGEST_MAX_EVENT_AGE_MS = 24 * 60 * 60 * 1000;
