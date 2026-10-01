export const GEO_INGEST_FIRST_HIT_KEY_PREFIX = "geo:ingest-first-hit:v1";
export const GEO_INGEST_RECEIVED_SAMPLE_RATE = 0.01;
export const GEO_INGEST_RECEIVED_SAMPLE_DENOMINATOR = 100;
// Dropped (human/unknown) traffic outnumbers stored events by an order of
// magnitude; log a sample so drop reasons stay visible without paying for a
// log line per page view. Each sampled line carries `weight` so Axiom totals
// can be scaled back up with sum(weight).
export const GEO_INGEST_DROPPED_LOG_SAMPLE_RATE = 0.05;
export const GEO_INGEST_ERROR_MESSAGE_MAX_LENGTH = 200;
