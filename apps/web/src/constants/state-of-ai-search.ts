import { SITE_URL } from "@/utils/urls";

export const STATE_OF_AI_SEARCH_PATH = "/state-of-ai-search";
export const STATE_OF_AI_SEARCH_URL = `${SITE_URL}${STATE_OF_AI_SEARCH_PATH}`;
export const STATE_OF_AI_SEARCH_TITLE = "State of AI Search";
export const STATE_OF_AI_SEARCH_DESCRIPTION =
  "Monthly reports on which brands ChatGPT, Claude and Google's AI Overview recommend, category by category. Rankings, the prompts behind them and the sources the assistants cite.";
export const STATE_OF_AI_SEARCH_SIGNUP_SOURCE = "state-of-ai-search";

/** Ranking rows shown before "Show all". */
export const RANKING_COLLAPSED_ROWS = 8;
export const PROMPTS_PAGE_SIZE = 10;
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
