import { GEO_TRAFFIC_FLUSH_INTERVAL_MS } from "@notra/analytics/constants/cache";

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
// Tinybird bills shared vCPU per active minute: any minute with one write
// counts in full. Writing every event on arrival kept the workspace active
// around the clock, so the long-running ingest service buffers events and
// flushes them on wall-clock boundaries, which lets every replica land in
// the same billed minute. The geo query cache expires on the same
// boundaries. GEO_INGEST_FLUSH_INTERVAL_MS=0 restores per-event writes.
export const GEO_INGEST_FLUSH_INTERVAL_MS = GEO_TRAFFIC_FLUSH_INTERVAL_MS;
export const GEO_INGEST_FLUSH_MAX_ROWS = 1000;
export const GEO_INGEST_MAX_BUFFERED_EVENTS = 50_000;
export const GEO_INGEST_FLUSH_TIMEOUT_MS = 10_000;
