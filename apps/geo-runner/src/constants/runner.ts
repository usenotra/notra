/** Scans in flight at once. Each one fans out to at most four model calls. */
export const RUNNER_SCAN_CONCURRENCY = 3;
/** Accepted-but-waiting scans. Past this the runner answers 503 instead of queueing. */
export const RUNNER_QUEUE_CAPACITY = 100;
export const RUNNER_STALE_SWEEP_INTERVAL = "1 minute";
/** Bun's maximum; a wedged client must not hold sockets forever. */
export const RUNNER_IDLE_TIMEOUT_SECONDS = 255;
export const RUNNER_DEFAULT_PORT = 3000;
export const RUNNER_MAX_REQUEST_BODY_BYTES = 16 * 1024;
export const RUNNER_SECRET_MIN_LENGTH = 32;
export const RUNNER_LOCAL_SECRET = "geo-runner-local-development-secret";
