export const INGEST_MAX_BODY_BYTES = 64 * 1024;
export const INGEST_DEFAULT_PORT = 3101;
// Drain, buffered-event flush and log flush stay below
// RAILWAY_DEPLOYMENT_DRAINING_SECONDS=60 so the process exits on its own
// before Railway sends SIGKILL.
export const INGEST_DRAIN_TIMEOUT_MS = 35_000;
export const INGEST_EVENTS_FLUSH_TIMEOUT_MS = 12_000;
export const INGEST_FLUSH_TIMEOUT_MS = 10_000;
export const INGEST_REQUIRED_ENV = [
  "DATABASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "TINYBIRD_TOKEN",
] as const;
