export const GEO_LOG_EVENT_PREFIX = "geo.";
export const LOG_PIPELINE_OPTIONS = {
  batch: { size: 50, intervalMs: 2000 },
  retry: { maxAttempts: 3, initialDelayMs: 250, maxDelayMs: 1000 },
  maxBufferSize: 1000,
};
