export const HISTORY_KINDS = new Set(["api", "ai", "ingest"]);
export const HISTORY_DAY_MS = 86_400_000;
export const HISTORY_WINDOW_MS = 7 * HISTORY_DAY_MS;
export const HISTORY_FIELDS = [
  "calls",
  "errors",
  "totalTokens",
  "estimatedRequests",
] as const;
