/**
 * Tracked competitors an LLM prompt gets (personas, conversations, prompt
 * suggestions, writer briefs, agent context). A project can track far more;
 * a prompt only needs the ones that matter, so this also caps token usage.
 */
export const GEO_CONTEXT_COMPETITOR_LIMIT = 25;
/** Mentions from this many trailing days rank competitors by relevance. */
export const GEO_CONTEXT_COMPETITOR_LOOKBACK_DAYS = 30;
