export const GEO_CONTENT_GAP_REFRESH_BATCH_SIZE = 25;
export const GEO_CONTENT_GAP_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** Re-read while a snapshot is missing; each read retries building it. */
export const GEO_CONTENT_GAPS_PREPARING_POLL_MS = 30_000;
