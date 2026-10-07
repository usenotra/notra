export const AGENT_DEFAULT_MODEL = "anthropic/claude-sonnet-5";
export const UTILITY_MODEL_ID = "openai/gpt-6-luna";
/**
 * Background content agent (changelog, blog, social posts). Picked with
 * `bun run evals pick`: matches Sonnet 5's score on the content-agent suite at
 * ~1/26 of the cost.
 */
export const CONTENT_AGENT_MODEL = "openai/gpt-6-luna";

export const GEO_WRITER_MODEL = "anthropic/claude-opus-5.5";
export const GEO_WRITER_PLANNER_MODEL = "anthropic/claude-opus-5.5";
export const GEO_WRITER_PLANNER_MAX_TOKENS = 8000;
export const GEO_WRITER_PLANNER_REPAIR_ATTEMPTS = 1;
export const GEO_WRITER_HUMANIZER_MAX_TOKENS = 8000;
export const GEO_WRITER_MAX_STEPS = 40;
