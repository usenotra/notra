import { SITE_URL } from "@/utils/urls";

export const STATE_OF_AI_SEARCH_PATH = "/state-of-ai-search";
export const STATE_OF_AI_SEARCH_URL = `${SITE_URL}${STATE_OF_AI_SEARCH_PATH}`;
export const STATE_OF_AI_SEARCH_TITLE = "State of AI Search";
export const STATE_OF_AI_SEARCH_DESCRIPTION =
  "Monthly reports on which brands ChatGPT, Claude and Google's AI Overview recommend, category by category. Rankings, the prompts behind them and the sources the assistants cite.";
export const STATE_OF_AI_SEARCH_SIGNUP_SOURCE = "state-of-ai-search";

/** Brands per page in the ranking and the heatmap, which page together. */
export const BRANDS_PAGE_SIZE = 8;
export const PROMPTS_PAGE_SIZE = 10;
/** One row height for every report table, so side-by-side tables line up. */
export const REPORT_ROW_HEIGHT = 48;
export const REPORT_LEADER_LOGOS = 3;

export const STATE_OF_AI_SEARCH_CTA_HEADING = "Where do you rank in AI search?";
export const STATE_OF_AI_SEARCH_CTA_SUBCOPY =
  "Notra runs these checks daily for your brand and your prompts, then drafts the content that moves the answer.";

/** Same palette as the homepage share-of-voice table: one color per top brand. */
export const REPORT_BRAND_COLORS = [
  "#8B5CF6",
  "#F59E0B",
  "#10B981",
  "#0EA5E9",
  "#F43F5E",
] as const;
export const REPORT_OTHER_BRAND_COLOR = "#64748B";

/** Heatmap tints, in percent of the primary color, as in the dashboard. */
export const HEATMAP_MIN_TINT = 8;
export const HEATMAP_MAX_TINT = 80;
export const HEATMAP_LIGHT_TEXT_TINT = 62;
/** Prompts listed in the brand drawer. */
export const BRAND_SHEET_PROMPTS = 8;
/** Drawers opened from drawers stop here, so the stack stays readable. */
export const MAX_SHEET_DEPTH = 2;

/**
 * Lifted cards on the report and its drawers get a white inner ring in dark mode: a top
 * highlight plus a faint inset edge, on top of the usual drop shadow.
 */
export const REPORT_SURFACE_LIFT =
  "dark:[--surface-lift:inset_0_1px_0_rgb(255_255_255/0.12),inset_0_0_0_1px_rgb(255_255_255/0.05),inset_0_8px_16px_-12px_rgb(255_255_255/0.06),0_1px_2px_rgb(0_0_0/0.4)]";
