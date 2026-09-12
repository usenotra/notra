export const CONTENT_CREATE_ENTRIES = [
  "home",
  "content_list",
  "hotkey",
  "nav_primary",
] as const;

export const CHAT_ATTACHMENT_SIZE_BUCKETS = [
  "lt_1mb",
  "lt_5mb",
  "lt_20mb",
  "gte_20mb",
] as const;

const MEGABYTE = 1024 * 1024;

export const CHAT_ATTACHMENT_SIZE_BUCKET_LIMITS = {
  lt_1mb: MEGABYTE,
  lt_5mb: 5 * MEGABYTE,
  lt_20mb: 20 * MEGABYTE,
} as const;

export const CHAT_CONTEXT_KINDS = [
  "github",
  "linear",
  "granola",
  "mcp",
] as const;

export const CHAT_CONTEXT_KIND_PREFIXES: Record<
  string,
  (typeof CHAT_CONTEXT_KINDS)[number]
> = {
  github: "github",
  linear: "linear",
  granola: "granola",
  mcp: "mcp",
};

export const CHAT_TRANSPORTS = ["direct", "workflow"] as const;

export const CHAT_GENERATION_BLOCKED_CODES = [
  "USAGE_LIMIT_REACHED",
  "CHAT_READ_ONLY",
  "ALREADY_GENERATING",
  "BILLING_ERROR",
  "BILLING_UNAVAILABLE",
] as const;

export const CHAT_DRAFT_ACTIONS = [
  "approve",
  "deny",
  "save_draft",
  "save_published",
  "regenerate",
  "publish_social",
] as const;

export const CHAT_TOOL_APPROVAL_DECISIONS = ["approved", "denied"] as const;

export const COMMAND_PALETTE_OPEN_SOURCES = ["hotkey", "button"] as const;

export const COMMAND_PALETTE_RESULT_KINDS = ["route", "entity", "ai"] as const;

export const COMMAND_PALETTE_AI_ERROR_ACTION = "error";

export const IMAGE_EXPORT_DOWNLOAD_TARGET = "download";

export const AI_CREDITS_SOURCE_STANDALONE_CHAT = "standalone_chat";

export const AI_CREDITS_SOURCE_CONTENT_CHAT = "chat";

export const AI_CREDITS_SOURCE_DASHBOARD_AGENT_CHAT = "dashboard_agent_chat";

export const DEFAULT_SIDEBAR_ENTRY_MODE = "studio";

export const CHAT_MODEL_AUTO = "auto";
