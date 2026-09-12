/** Model that plays the buyer persona; cheap because it runs once per turn. */
export const GEO_PERSONA_AGENT_MODEL = "openai/gpt-5.4-mini";
/** Increment when the persona system or turn instructions change. */
export const GEO_PERSONA_PROMPT_VERSION = 2;
export const GEO_PERSONA_AGENT_MAX_TOKENS = 1200;
export const GEO_PERSONA_MESSAGE_MAX_LENGTH = 400;
export const GEO_PERSONA_REASONING_MAX_LENGTH = 600;
