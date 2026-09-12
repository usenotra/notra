import type { LookbackWindow } from "@notra/schemas/dashboard/integrations";

export const DEFAULT_LOOKBACK_WINDOW: LookbackWindow = "last_7_days";
export const GITHUB_RATE_LIMIT_RETRY_DELAY = "30m";
export const SCHEDULE_RATE_LIMIT_MAX_ATTEMPTS = 3;
export const GITHUB_RATE_LIMIT_RETRY_DELAY_SECONDS = 30 * 60;
export const SCHEDULE_AI_CREDIT_LOCK_TTL_MS = 3 * 60 * 60 * 1000;
export const EVENT_MAX_LISTED_COMMITS = 10;
export const CONTENT_EMAIL_DIGEST_DELAY = "5m";
export const CONTENT_EMAIL_DIGEST_TTL_SECONDS = 15 * 60;
export const AUTOMATED_WORKFLOW_FAILURE_PAUSE_THRESHOLD = 3;
export const AUTOMATED_WORKFLOW_FAILURE_STATE_TTL_SECONDS = 30 * 24 * 60 * 60;
