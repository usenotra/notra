import { UTILITY_MODEL_ID } from "@notra/ai/constants/models";

export const GSC_OAUTH_STATE_TTL_SECONDS = 600;
export const GSC_OAUTH_STATE_KEY_PREFIX = "gsc_oauth:";
export const GSC_OAUTH_CALLBACK_PATH =
  "/api/integrations/google-search-console/callback";
export const GSC_OAUTH_AUTHORIZE_PATH =
  "/api/integrations/google-search-console/authorize";
export const GSC_SYNC_WORKFLOW_PATH = "/api/workflows/gsc-sync";
/** Mondays 06:00 UTC */
export const GSC_SYNC_CRON = "0 6 * * 1";
export const GSC_SYNC_LOOKBACK_DAYS = 28;
export const GSC_SYNC_ROW_LIMIT = 250;
/** Queries below this are noise and waste model context. */
export const GSC_SYNC_MIN_IMPRESSIONS = 5;
export const GSC_SYNC_MAX_KEYWORDS_FOR_MODEL = 80;
export const GSC_SUGGESTIONS_MAX_PER_SYNC = 15;
export const GSC_MAX_KEYWORDS_PER_SUGGESTION = 8;
export const GSC_SUGGESTION_MODEL = UTILITY_MODEL_ID;
export const GSC_SUGGESTION_MAX_TOKENS = 3000;
export const GSC_SCHEDULE_ID_PREFIX = "gsc-sync-";
