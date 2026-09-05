/** Model that plays the buyer persona; cheap because it runs once per turn. */
export const GEO_PERSONA_AGENT_MODEL = "openai/gpt-5.4-mini";
/** Memory lookups plus the final structured reply. */
export const GEO_PERSONA_AGENT_MAX_STEPS = 6;
export const GEO_PERSONA_AGENT_MAX_TOKENS = 1200;
export const GEO_PERSONA_MEMORY_SEARCH_LIMIT = 5;
export const GEO_PERSONA_MEMORY_QUERY_MAX_LENGTH = 300;
export const GEO_PERSONA_MESSAGE_MAX_LENGTH = 400;
export const GEO_PERSONA_REASONING_MAX_LENGTH = 600;
export const GEO_PERSONA_VECTOR_URL_ENV = "UPSTASH_VECTOR_REST_URL";
export const GEO_PERSONA_VECTOR_TOKEN_ENV = "UPSTASH_VECTOR_REST_TOKEN";
/** Vector ids are `<personaId>:<memoryId>` so a persona can be dropped by prefix. */
export const GEO_PERSONA_VECTOR_ID_SEPARATOR = ":";
export const GEO_PERSONA_VECTOR_UPSERT_CHUNK = 50;
