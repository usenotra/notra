/**
 * Prod gets `caching: "auto"` from `withRouterDefaults`. Without it Anthropic
 * models pay full input price on every agent step and look ~2× pricier than
 * they are in prod. Fallback models are left out on purpose so a failed call
 * never gets scored as a different model.
 */
export const PROD_GATEWAY_CACHING = "auto" as const;
