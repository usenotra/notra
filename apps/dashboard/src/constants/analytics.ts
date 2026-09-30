import type {
  LeaderboardWindow,
  PostingActivityLevel,
} from "@/types/analytics";

export const SOCIAL_ANALYTICS_FLAG_KEY = "social-analytics";
export const ANALYTICS_NAV_LINK = "/analytics";
export const ANALYTICS_FLAG_CACHE_TTL_MS = 60_000;
export const ANALYTICS_FLAG_REQUEST_TIMEOUT_MS = 5000;
export const ANALYTICS_FLAG_FAILURE_CACHE_TTL_MS = 5000;
export const ANALYTICS_FLAG_CACHE_CAPACITY = 5000;
export const MAX_PENDING_ANALYTICS_FLAG_EVALUATIONS = 500;
export const ANALYTICS_FLAGS_API_URL =
  process.env.DATABUDDY_FLAGS_API_URL ??
  "https://api.databuddy.cc/public/v1/flags/bulk";
export const ANALYTICS_FLAG_ERROR_REASON = "ERROR";

export const ANALYTICS_TIMESERIES_DAYS = 30;
export const TOP_POST_CONTENT_PREVIEW_LENGTH = 96;

export const ANALYTICS_PROVIDER_FILTER_VALUES = [
  "all",
  "twitter",
  "linkedin",
] as const;

export const ANALYTICS_PROVIDER_FILTERS = [
  { value: "all" },
  { value: "twitter", label: "X" },
  { value: "linkedin", label: "LinkedIn" },
] as const;

export const ACCOUNT_DETAIL_SERIES_KEY = "engagement";
export const ACCOUNT_DETAIL_MIN_POINTS = 2;
export const ACCOUNT_DETAIL_WINDOW: LeaderboardWindow = 30;
export const ACCOUNT_DETAIL_POSTS_LIMIT = 50;
export const ACCOUNT_POSTS_TABLE_HEIGHT = 288;
export const ACCOUNT_POSTS_PAGE_TABLE_HEIGHT = 620;

export const CONNECT_X_CLASS =
  "bg-[#0f1419] text-white hover:bg-[#0f1419]/90 dark:bg-white dark:text-[#0f1419] dark:hover:bg-white/90";

export const LEADERBOARD_PAGE_HEIGHT = 620;
export const LEADERBOARD_EMPTY_HEIGHT = 260;

export const CONNECT_LINKEDIN_CLASS =
  "bg-[#0a66c2] text-white hover:bg-[#0a66c2]/90";

export const ANALYTICS_TOOLTIP_DELAY_MS = 200;
export const CURSOR_TOOLTIP_EDGE_PX = 200;

export const ANALYTICS_RANGE_PRESETS = [
  { value: "today" },
  { value: "yesterday" },
  { value: "7d" },
  { value: "30d" },
  { value: "90d" },
  { value: "mtd" },
  { value: "qtd" },
  { value: "ytd" },
  { value: "all" },
] as const;

export const ANALYTICS_RANGE_PRESET_DAYS = {
  today: 0,
  yesterday: 1,
  "7d": 6,
  "30d": 29,
  "90d": 89,
} as const;

export const ANALYTICS_ALL_TIME_START = "2020-01-01";

export const POSTING_ACTIVITY_BAR_CLASSES: Record<
  PostingActivityLevel,
  string
> = {
  quiet: "bg-muted",
  low: "bg-chart-1/40",
  medium: "bg-chart-1/70",
  high: "bg-chart-1",
};
