export const FEATURE_DETAIL_SLUGS = [
  "personas",
  "conversations",
  "ai-crawler-logs",
] as const;

export const FEATURE_DETAIL_PATHS = FEATURE_DETAIL_SLUGS.map(
  (slug) => `/features/${slug}`
);

export const FEATURE_DETAIL_LAST_MODIFIED = new Date("2026-10-02");
