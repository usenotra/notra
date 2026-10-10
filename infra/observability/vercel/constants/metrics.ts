export const VERCEL_API = "https://api.vercel.com";
export const WINDOW_SECONDS = 300;
export const INGESTION_LAG_SECONDS = 600;
export const POLL_MS = 300_000;
export const REQUEST_TIMEOUT_MS = 30_000;
export const SERIES_LIMIT = 500;
export const SAFE_DIMENSIONS = ["projectId", "environment"];
export const MAX_CATALOG_PAGES = 10;
export const MAX_QUERY_OUTPUTS = 30;
export const SYSTEM_EVENT_PATTERN = /^vercel(?:\.[a-z0-9_]+){1,4}$/;
export const PLATFORM_BREAKDOWNS = [
  {
    id: "vercel.request.count",
    name: "http",
    dimensions: ["httpStatus", "requestMethod"],
  },
  { id: "vercel.request.count", name: "cache", dimensions: ["cacheResult"] },
  {
    id: "vercel.function_invocation.count",
    name: "http",
    dimensions: ["httpStatus"],
  },
  {
    id: "vercel.function_invocation.count",
    name: "runtime",
    dimensions: ["runtime", "functionStartType"],
  },
];

export const EXPORTER_METRICS = {
  notra_vercel_metric_window:
    "Native-unit values in a completed five-minute window; not counters.",
  notra_vercel_catalog_metrics: "Number of discovered system catalog metrics.",
  notra_vercel_supported_metrics:
    "Number of catalog metrics supported by the exporter.",
  notra_vercel_query_success: "Whether the latest group query succeeded.",
  notra_vercel_query_has_data:
    "Whether a successful group query returned numeric observations.",
  notra_vercel_window_end_seconds:
    "Unix end timestamp of the completed source window.",
  notra_vercel_metric_query_success:
    "Whether the latest query for a catalog metric succeeded.",
  notra_vercel_catalog_success: "Whether the latest catalog request succeeded.",
  notra_vercel_snapshot_fresh:
    "Whether the latest snapshot succeeded and is less than two polling intervals old.",
  notra_vercel_poll_completed_seconds:
    "Unix timestamp of the last completed catalog poll.",
};
