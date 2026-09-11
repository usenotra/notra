export const GEO_PERSONAS_NAV_LINK = "/geo/personas";
export const GEO_PERSONA_ACTIVITY_DAYS = 30;
export const GEO_PERSONA_MIN_COUNT = 5;
export const GEO_PERSONA_MAX_COUNT = 5;
export const GEO_PERSONA_MIN_MEMORIES = 6;
export const GEO_PERSONA_MAX_MEMORIES = 12;
export const GEO_PERSONA_PROFILE_LIST_MIN = 1;
export const GEO_PERSONA_PROFILE_LIST_MAX = 6;
export const GEO_PERSONA_FIELD_MAX_LENGTH = 200;
export const GEO_PERSONA_SUMMARY_MAX_LENGTH = 800;
export const GEO_PERSONA_MEMORY_MAX_LENGTH = 400;
/** Messages a persona may type per engine in one scan. */
export const GEO_PERSONA_MAX_TURNS = 4;
export const GEO_PERSONA_GENERATION_MODEL = "moonshotai/kimi-k3";
export const GEO_PERSONA_GENERATION_MAX_TOKENS = 20_000;
export const GEO_PERSONA_CONTEXT_PAGE_LIMIT = 30;
export const GEO_PERSONA_CONTEXT_PROMPT_LIMIT = 20;
export const GEO_PERSONA_TURN_TIMEOUT_MS = 90_000;
export const GEO_PERSONA_PAIR_TIMEOUT_MS = 8 * 60 * 1000;
export const GEO_SCAN_PERSONA_BATCH_SIZE = 3;
/** Scan results of persona turns are stored under `persona-<uuid>`. */
export const GEO_PERSONA_SCAN_ID_PREFIX = "persona-";
export const GEO_PERSONA_GENERATION_TRIGGER_ID = "geo-personas";
export const GEO_PERSONA_GENERATION_SYSTEM_PROMPT =
  "You design distinct buyer archetypes for AI visibility research. Each archetype has a short, recognizable name and a concrete customer profile grounded in the supplied audience and category. You output only JSON matching the requested schema, and you never invent facts about the company itself.";
