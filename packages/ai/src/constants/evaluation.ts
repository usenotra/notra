/** TypeSafe "System One" model: typed questions in, calibrated probabilities out. */
export const EVALUATION_MODEL_ID = "typesafe-ai/jev";

/** Set to `off`, `false` or `0` to route every classifier back to its LLM. */
export const EVALUATION_FLAG_ENV = "NOTRA_JEV_CLASSIFIERS";
export const EVALUATION_DISABLED_VALUES: ReadonlySet<string> = new Set([
  "0",
  "false",
  "off",
]);

/** Jev answers in ~300 ms p50 / ~550 ms p95; anything slower is a fault. */
export const EVALUATION_DEFAULT_TIMEOUT_MS = 5000;
export const EVALUATION_BOOLEAN_THRESHOLD = 0.5;
