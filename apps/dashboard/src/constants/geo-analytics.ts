export const GEO_DEFAULT_SCAN_TRIGGER = "manual" as const;

export const GEO_PROMPT_SOURCES = {
  MANUAL: "manual",
  WEBSITE_GENERATE: "website_generate",
  CSV: "csv",
  GSC_SUGGESTION: "gsc_suggestion",
  API: "api",
} as const;

export const GEO_COMPETITOR_SOURCES = {
  MANUAL: "manual",
  ONBOARDING_SUGGESTION: "onboarding_suggestion",
  CSV: "csv",
} as const;

export const GEO_PROMPT_DETAIL_SURFACES = {
  PROMPTS_TABLE: "prompts_table",
  ENGINE_SHEET: "engine_sheet",
  GAPS: "gaps",
  OVERVIEW: "overview",
} as const;

export const GEO_COMPETITOR_DETAIL_SURFACES = {
  PAGE: "page",
  MODAL: "modal",
} as const;

export const GEO_WRITE_DIALOG_ENTRIES = {
  GAP: "gap",
  ENGINE_SHEET: "engine_sheet",
  WRITE_PAGE: "write_page",
  NAV_PRIMARY: "nav_primary",
} as const;

export const GEO_WRITER_FAILURE_REASONS = {
  CREDITS_EXHAUSTED: "credits_exhausted",
  INVALID_STATE: "invalid_state",
  DUPLICATE_EXECUTION: "duplicate_execution",
  MODEL_ERROR: "model_error",
} as const;

export const GEO_SEQUENCE_RUN_OUTCOMES = {
  COMPLETED: "completed",
  RATE_LIMITED: "rate_limited",
} as const;

export const AGENT_READINESS_ERROR_KINDS = {
  REPLACED: "replaced",
  SCAN_FAILED: "scan_failed",
} as const;

export const AGENT_READINESS_REPLACED_REASON_PREFIX = "Scan was replaced";

export const AGENT_READINESS_FIX_COPY_KINDS = {
  FIX: "fix",
  MASTER: "master",
  BACKLOG: "backlog",
} as const;

export const TRAFFIC_INSTALL_COPY_KINDS = {
  AGENT_PROMPT: "agent_prompt",
  INSTALL_COMMAND: "install_command",
  PROXY_SNIPPET: "proxy_snippet",
} as const;

export const TRAFFIC_LOG_FILTER_KINDS = {
  VISITOR_TYPE: "visitor_type",
  PURPOSE: "purpose",
} as const;

export const GEO_INGEST_FIRST_HIT_KEY_PREFIX = "geo:ingest-first-hit:v1";

export const GEO_INGEST_RECEIVED_SAMPLE_RATE = 0.01;

export const GEO_INGEST_RECEIVED_SAMPLE_DENOMINATOR = 100;

export const GEO_SCAN_FAILURE_REASONS = {
  RETRY_NO_SUCCESSFUL_CHECKS: "retry_no_successful_checks",
  UNKNOWN: "unknown",
} as const;
