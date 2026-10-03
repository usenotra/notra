/** A model needs this many scored cases (or every case of a small suite). */
export const MIN_CASES = 5;
/** Models failing more calls than this are never recommended. */
export const MAX_ERROR_RATE = 0.1;

export const DEFAULT_VOLUME = 1000;

/**
 * Stages whose spend is already inside another suite's call in prod (the
 * draft and unslop steps run inside the one content agent loop), so they are
 * left out of the monthly totals.
 */
export const COST_INCLUDED_IN: Readonly<Record<string, string>> = {
  "content-draft": "content-agent",
  "content-unslop": "content-agent",
};
