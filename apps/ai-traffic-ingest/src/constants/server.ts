export const INGEST_MAX_BODY_BYTES = 64 * 1024;
export const INGEST_DEFAULT_PORT = 3101;
// Stays below RAILWAY_DEPLOYMENT_DRAINING_SECONDS=60 so telemetry still flushes
// before Railway sends SIGKILL.
export const INGEST_DRAIN_TIMEOUT_MS = 45_000;
export const INGEST_REQUIRED_ENV = [
  "DATABASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "TINYBIRD_TOKEN",
] as const;
