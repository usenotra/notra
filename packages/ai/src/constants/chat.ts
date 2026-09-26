export const CHAT_ABORT_FLAG_TTL_SECONDS = 300;
export const CHAT_ACTIVE_STREAM_TTL_SECONDS = 600;
export const CHAT_ACTIVE_STREAM_REFRESH_INTERVAL_MS = 60_000;
export const CHAT_WORKFLOW_REQUEST_TTL_SECONDS = 60 * 60 * 24;
export const CHAT_LAST_STOPPED_TTL_SECONDS = 300;
export const CHAT_ABORT_POLL_INTERVAL_MS = 500;
// Leave room for authorization and subscription cleanup under the 600s limit.
export const CHAT_STREAM_MAX_LIFETIME_MS = 9 * 60 * 1000;
export const CHAT_TITLE_MAX_LENGTH = 80;
export const SLACK_RELAY_EVENT_TYPE = "notra_dashboard_message";
export const CHAT_DELETION_TOMBSTONE_TTL_SECONDS = 60 * 60 * 24 * 7;
export const CHAT_PREVIEW_SAVE_TIMEOUT_MS = 30_000;
export const CHAT_INTEGRATIONS_CACHE_TTL_SECONDS = 300;
