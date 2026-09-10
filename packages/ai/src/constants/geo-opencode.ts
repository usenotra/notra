export const GEO_OPENCODE_BOX_MODEL_ID = "openrouter/openai/gpt-5.6-sol";
export const GEO_OPENCODE_REASONING_EFFORT = "medium" as const;
export const GEO_CLAUDE_CODE_EFFORT = "medium" as const;
export const GEO_CODEX_REASONING_EFFORT = "medium" as const;
export const GEO_CODEX_WEB_SEARCH = true as const;
export const GEO_OPENCODE_RUN_TIMEOUT_MS = 150_000;
export const GEO_OPENCODE_SOURCE_LIMIT = 20;
export const GEO_OPENCODE_BOX_API_BASE_URL =
  "https://us-east-1.box.upstash.com";
export const GEO_OPENCODE_BOX_POLL_INTERVAL_MS = 2000;
export const GEO_OPENCODE_BOX_NAME_PREFIX = "notra-geo-";
export const GEO_OPENCODE_BOX_DELETE_ATTEMPTS = 3;
export const GEO_OPENCODE_BOX_RECOVERY_ATTEMPTS = 8;
export const GEO_OPENCODE_BOX_RETRY_DELAY_MS = 1000;
export const GEO_OPENCODE_BOX_MANAGEMENT_TIMEOUT_MS = 10_000;
export const GEO_OPENCODE_BOX_RECOVERY_TIMEOUT_MS = 30_000;
export const GEO_OPENCODE_STALE_BOX_AGE_MS = 30 * 60 * 1000;
export const GEO_OPENCODE_MILLISECONDS_PER_SECOND = 1000;
export const GEO_OPENCODE_MILLISECOND_TIMESTAMP_MINIMUM = 1_000_000_000_000;
export const GEO_OPENCODE_HTTP_URL_PATTERN = /https?:\/\/[^\s<>"'`]+/giu;
export const GEO_OPENCODE_MARKDOWN_LINK_HREF_PATTERN =
  /\[(?:[^\]]*)\]\((https?:\/\/[^\s)]+)\)/giu;
export const GEO_OPENCODE_MARKDOWN_BOLD_AFFIX_PATTERN = /\)\*+$/u;
export const GEO_OPENCODE_TRAILING_URL_PUNCTUATION_PATTERN = /[),.;:\]}]+$/u;

export const GEO_OPENCODE_BOX_API_KEY_ENV = "UPSTASH_BOX_API_KEY";
export const GEO_OPENCODE_MODEL_API_KEY_ENV = "OPENROUTER_API_KEY";
