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
export const GEO_INGEST_ADMISSION_RATELIMIT_PREFIX =
  "ratelimit:geo-ingest-admission";
export const GEO_INGEST_ADMISSION_RATELIMIT_MAX_REQUESTS = 1000;
export const GEO_INGEST_TINYBIRD_TIMEOUT_MS = 5000;
// Client timestamps outside this window are replaced with the receive time so
// a skewed or forged clock cannot backdate stats or land outside ClickHouse's
// DateTime range.
export const GEO_INGEST_MAX_CLOCK_SKEW_FUTURE_MS = 5 * 60 * 1000;
export const GEO_INGEST_MAX_EVENT_AGE_MS = 24 * 60 * 60 * 1000;
// Batched Tinybird writes from the ingest service; the window itself is
// GEO_TRAFFIC_FLUSH_INTERVAL_MS in @notra/analytics, shared with the cache.
export const GEO_INGEST_FLUSH_MAX_ROWS = 1000;
export const GEO_INGEST_MAX_BUFFERED_EVENTS = 50_000;
export const GEO_INGEST_FLUSH_TIMEOUT_MS = 10_000;
// Organizations with an open live view are written after this delay, so a
// burst of requests becomes one write.
export const GEO_INGEST_LIVE_FLUSH_DELAY_MS = 1000;
// A failed live write is retried this often before the organization's rows
// wait for the next window.
export const GEO_INGEST_LIVE_RETRY_DELAY_MS = 5000;
export const GEO_INGEST_LIVE_MAX_RETRIES = 3;
