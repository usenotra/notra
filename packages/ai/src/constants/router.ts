import type { GatewayId, RouterPolicyConfig } from "@notra/ai/types/router";

export const GATEWAY_IDS: readonly GatewayId[] = ["vercel", "openrouter"];

export const ROUTER_PROVIDER_OPTIONS_KEY = "notraRouter";
export const ROUTER_METADATA_KEY = "notraRouter";
export const ROUTED_MODEL_PROVIDER = "notra-router";

export const DEFAULT_PLAN_CACHE_TTL_MS = 60_000;
export const DEFAULT_CREDIT_CHECK_TTL_MS = 30_000;
export const DEFAULT_UNAVAILABLE_TTL_MS = 5 * 60_000;

export const DEFAULT_OPENROUTER_ACCOUNT_BASE_URL =
  "https://openrouter.ai/api/v1";

export const OPENROUTER_PRIVACY_PROVIDER_ROUTING = {
  zdr: true,
  data_collection: "deny",
} as const;

export const VERCEL_NAMESPACE_PREFIX = "vercel/";

export const OPENROUTER_MODEL_ALIASES: Readonly<Record<string, string>> = {
  "google/gemini-3-flash": "google/gemini-3-flash-preview",
  "meta/llama-4-maverick": "meta-llama/llama-4-maverick",
  "meta/llama-4-scout": "meta-llama/llama-4-scout",
  "meta/llama-3.3-70b": "meta-llama/llama-3.3-70b-instruct",
  "meta/llama-3.1-70b": "meta-llama/llama-3.1-70b-instruct",
  "meta/llama-3.1-8b": "meta-llama/llama-3.1-8b-instruct",
  "mistral/mistral-medium-3.5": "mistralai/mistral-medium-3-5",
  "mistral/mistral-large-3": "mistralai/mistral-large-2512",
  "spacexai/grok-4.6": "x-ai/grok-4.6",
  "spacexai/grok-4.5": "x-ai/grok-4.5",
  "spacexai/grok-build-0.1": "x-ai/grok-build-0.1",
  "spacexai/grok-4.3": "x-ai/grok-4.3",
  "spacexai/grok-4.20-multi-agent": "x-ai/grok-4.20-multi-agent",
  "zai/glm-5.3-flash": "z-ai/glm-5.3-flash",
  "zai/glm-5.3": "z-ai/glm-5.3",
  "zai/glm-5.2": "z-ai/glm-5.2",
  "zai/glm-5.1": "z-ai/glm-5.1",
  "zai/glm-5v-turbo": "z-ai/glm-5v-turbo",
  "zai/glm-5-turbo": "z-ai/glm-5-turbo",
  "zai/glm-5": "z-ai/glm-5",
  "zai/glm-4.7-flash": "z-ai/glm-4.7-flash",
};

const RETIRED_MODELS = ["mistral/magistral-medium"];

export const OPENROUTER_UNSUPPORTED_MODELS: ReadonlySet<string> = new Set([
  "moonshotai/kimi-k2.7-code-highspeed",
  "zai/glm-5.3-promo-50",
  "zai/glm-4.7-flashx",
  "spacexai/grok-4.20-non-reasoning",
  "spacexai/grok-4.20-reasoning",
  "spacexai/grok-4.1-fast-non-reasoning",
  "spacexai/grok-4.1-fast-reasoning",
  "deepseek/deepseek-v3.2-thinking",
  "deepseek/deepseek-v3.1",
  "mistral/mistral-medium",
  "mistral/mistral-small",
  ...RETIRED_MODELS,
]);

export const VERCEL_UNSUPPORTED_MODELS: ReadonlySet<string> = new Set(
  RETIRED_MODELS
);

export const VERCEL_OPTIONS_KEY = "gateway";
export const OPENROUTER_OPTIONS_KEY = "openrouter";

export const OPENROUTER_EFFORTS: ReadonlySet<string> = new Set([
  "xhigh",
  "high",
  "medium",
  "low",
  "minimal",
  "none",
]);

export const HTTP_BAD_REQUEST = 400;
export const HTTP_PAYMENT_REQUIRED = 402;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOT_FOUND = 404;
export const HTTP_REQUEST_TIMEOUT = 408;
export const HTTP_CONFLICT = 409;
export const HTTP_TOO_EARLY = 425;
export const HTTP_TOO_MANY_REQUESTS = 429;
export const HTTP_SERVER_ERROR_MIN = 500;
/**
 * Vercel AI Gateway rejects a request that has no ZDR-capable provider with
 * 400 `no_providers_available` ("No ZDR (Zero Data Retention) providers
 * available for model: ..."); team-plan gating surfaces as 403.
 */
export const ZDR_ERROR_PATTERN =
  /zero data retention|\bzdr\b|no_providers_available/i;
export const ZDR_REJECTION_STATUS_CODES: ReadonlySet<number> = new Set([
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
]);
/**
 * OpenRouter answers 404 "No endpoints found matching your data policy" when
 * `provider.zdr` filters every host away. That is a ZDR rejection, not an
 * unknown model.
 */
export const OPENROUTER_NO_ZDR_ENDPOINT_PATTERN =
  /no endpoints found.*(data policy|zero data retention|\bzdr\b)/i;

export const RETRYABLE_STATUS_CODES: ReadonlySet<number> = new Set([
  HTTP_REQUEST_TIMEOUT,
  HTTP_CONFLICT,
  HTTP_TOO_EARLY,
  HTTP_TOO_MANY_REQUESTS,
]);

export const ROUTER_POLICY = {
  defaultGateway: "openrouter",
  paidGateway: "vercel",
  freeGateway: "openrouter",
  allowNonZdr: process.env.NODE_ENV === "development",
  crossGatewayFallback: true,
} satisfies RouterPolicyConfig;

export const NO_TRAINING_PROVIDER_ERROR_PATTERN =
  /No providers that disallow prompt training available for model:/i;
