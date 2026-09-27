export const AGENT_RUN_BACKEND_SLEEP_SECONDS = 30;
export const AGENT_RUN_SOFT_LIMIT_POLLS = 30;
export const AGENT_RUN_HARD_LIMIT_POLLS = 60;
export const AGENT_RUN_HARD_LIMIT_MS =
  AGENT_RUN_HARD_LIMIT_POLLS * AGENT_RUN_BACKEND_SLEEP_SECONDS * 1000;
export const AGENT_RUN_LEASE_MARGIN_MS = 10 * 60 * 1000;
export const AGENT_RUN_REFETCH_INTERVAL_MS = 10_000;
export const AGENT_RUN_IDLE_REFETCH_INTERVAL_MS = 30_000;
export const AGENT_RUN_STALE_TIME_MS = 60_000;
export const SUGGESTIONS_STALE_TIME_MS = 300_000;
export const WEBSITE_REACHABILITY_TIMEOUT_MS = 5000;
export const WEBSITE_REACHABILITY_MAX_REDIRECTS = 5;
export const EVE_ACCENT_COLOR = "#9333EA";
export const EVE_SETUP_PROS = [
  "brandColors",
  "writingSkills",
  "references",
] as const;
export const EVE_SETUP_CONS = ["skillsOverwritten", "colorsReplaced"] as const;
export const EVE_BANNER_COLORS_LIGHT = {
  colorBack: "#FFFFFF",
  colorFront: "#CBB6EF",
} as const;
export const EVE_BANNER_COLORS_DARK = {
  colorBack: "#131316",
  colorFront: "#4C1D95",
} as const;
export const EVE_BANNER_HEIGHT = "2.75rem";
export const EVE_BANNER_DITHER_SHAPE = "simplex";
export const EVE_BANNER_DITHER_TYPE = "4x4";
export const EVE_BANNER_DITHER_SIZE = 2;
export const EVE_BANNER_DITHER_SPEED = 0.35;
export const EVE_BANNER_DITHER_SCALE = 0.6;
export const EVE_CREATE_SESSION_ROUTE_PATH = "/eve/v1/session";
export const EVE_SESSION_TASK_MODE = "task";
export const TRAILING_SLASH_PATTERN = /\/$/;
export const WWW_PREFIX_PATTERN = /^www\./;
export const SERVER_ERROR_STATUS = 500;
