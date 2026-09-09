import type { JSONObject, SharedV3ProviderOptions } from "@ai-sdk/provider";
import {
  OPENROUTER_EFFORTS,
  OPENROUTER_OPTIONS_KEY,
  ROUTER_PROVIDER_OPTIONS_KEY,
  VERCEL_OPTIONS_KEY,
} from "@notra/ai/constants/router";
import { routerProviderOptionsSchema } from "@notra/ai/schemas/router";
import type {
  BuildProviderOptionsInput,
  GatewayId,
  RouterProviderOptions,
} from "@notra/ai/types/router";

import { toOpenRouterModelId, toVercelModelId } from "./model-ids";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asObject(value: unknown): Record<string, unknown> {
  return isObject(value) ? value : {};
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function resolveFallbackModels(
  router: RouterProviderOptions,
  existingModels: unknown,
  mapModel: (modelId: string) => string
): string[] | undefined {
  if (router.fallbackModels && router.fallbackModels.length > 0) {
    return router.fallbackModels.map(mapModel);
  }
  return isStringArray(existingModels) ? existingModels : undefined;
}

/**
 * Production forces ZDR on. A relaxed call (caller accepted a non-ZDR route)
 * drops it; the development bypass only sends it when the caller asks.
 */
function resolveZdrFlag(
  relaxZdr: boolean,
  allowNonZdr: boolean,
  requested: unknown
): boolean {
  if (relaxZdr) {
    return false;
  }
  return allowNonZdr ? requested === true : true;
}

/**
 * Split the neutral router block from the caller's provider options.
 */
export function splitRouterOptions(providerOptions?: SharedV3ProviderOptions): {
  router: RouterProviderOptions;
  rest: SharedV3ProviderOptions;
} {
  if (!providerOptions) {
    return { router: {}, rest: {} };
  }

  const { [ROUTER_PROVIDER_OPTIONS_KEY]: rawRouter, ...rest } = providerOptions;
  const router = routerProviderOptionsSchema.parse(rawRouter);

  return { router, rest };
}

/**
 * Remove the other gateway's block so provider-specific options never leak
 * across gateways.
 */
export function stripForeignGatewayOptions(
  gateway: GatewayId,
  providerOptions: SharedV3ProviderOptions
): SharedV3ProviderOptions {
  const foreignKey =
    gateway === "vercel" ? OPENROUTER_OPTIONS_KEY : VERCEL_OPTIONS_KEY;
  if (!(foreignKey in providerOptions)) {
    return providerOptions;
  }
  const { [foreignKey]: _removed, ...rest } = providerOptions;
  return rest;
}

export function buildVercelProviderOptions(
  input: BuildProviderOptionsInput
): SharedV3ProviderOptions {
  const { providerOptions, router, allowNonZdr, relaxZdr = false } = input;
  const existing = asObject(providerOptions[VERCEL_OPTIONS_KEY]);
  const fallbackModels = resolveFallbackModels(
    router,
    existing.models,
    toVercelModelId
  );

  // Relaxed routes accept providers without ZDR or no-training guarantees.
  // Explicit caller no-training restrictions still apply.
  const zeroDataRetention = resolveZdrFlag(
    relaxZdr,
    allowNonZdr,
    existing.zeroDataRetention
  );
  const disallowPromptTraining = relaxZdr
    ? existing.disallowPromptTraining === true
    : !(allowNonZdr && existing.disallowPromptTraining === false);

  const { zeroDataRetention: _ignoredZdr, ...existingWithoutZdr } = existing;
  const gatewayOptions: Record<string, unknown> = {
    ...existingWithoutZdr,
    caching: router.caching ?? existing.caching ?? "auto",
    ...(fallbackModels ? { models: fallbackModels } : {}),
    ...(zeroDataRetention ? { zeroDataRetention: true } : {}),
    disallowPromptTraining,
  };

  return {
    ...stripForeignGatewayOptions("vercel", providerOptions),
    [VERCEL_OPTIONS_KEY]: gatewayOptions as JSONObject,
  };
}

function deriveOpenRouterReasoning(
  router: RouterProviderOptions,
  providerOptions: SharedV3ProviderOptions
): Record<string, unknown> | undefined {
  if (router.reasoning?.budgetTokens) {
    return { max_tokens: router.reasoning.budgetTokens };
  }
  if (router.reasoning?.effort) {
    return { effort: router.reasoning.effort };
  }

  const anthropic = asObject(providerOptions.anthropic);
  const thinking = asObject(anthropic.thinking);
  if (
    thinking.type === "enabled" &&
    typeof thinking.budgetTokens === "number"
  ) {
    return { max_tokens: thinking.budgetTokens };
  }
  if (thinking.type === "adaptive") {
    const outputConfig = asObject(anthropic.output_config);
    const effort = outputConfig.effort;
    if (typeof effort === "string" && OPENROUTER_EFFORTS.has(effort)) {
      return { effort };
    }
    return { enabled: true, effort: "medium" };
  }

  const openai = asObject(providerOptions.openai);
  const reasoningEffort = openai.reasoningEffort;
  if (
    typeof reasoningEffort === "string" &&
    OPENROUTER_EFFORTS.has(reasoningEffort)
  ) {
    return { effort: reasoningEffort };
  }

  return undefined;
}

export function buildOpenRouterProviderOptions(
  input: BuildProviderOptionsInput
): SharedV3ProviderOptions {
  const { providerOptions, router, allowNonZdr, relaxZdr = false } = input;
  const existing = asObject(providerOptions[OPENROUTER_OPTIONS_KEY]);
  const existingProvider = asObject(existing.provider);

  const zdr = resolveZdrFlag(relaxZdr, allowNonZdr, existingProvider.zdr);
  const dataCollection =
    (relaxZdr && existingProvider.data_collection !== "deny") ||
    (allowNonZdr && existingProvider.data_collection === "allow")
      ? "allow"
      : "deny";

  const { zdr: _ignoredZdr, ...existingProviderWithoutZdr } = existingProvider;
  const provider: Record<string, unknown> = {
    ...existingProviderWithoutZdr,
    zdr,
    data_collection: dataCollection,
  };

  const fallbackModels = resolveFallbackModels(
    router,
    existing.models,
    toOpenRouterModelId
  );

  const reasoning = isObject(existing.reasoning)
    ? existing.reasoning
    : deriveOpenRouterReasoning(router, providerOptions);

  const openrouterOptions: Record<string, unknown> = {
    ...existing,
    provider,
    ...(fallbackModels ? { models: fallbackModels } : {}),
    ...(reasoning ? { reasoning } : {}),
  };

  return {
    ...stripForeignGatewayOptions("openrouter", providerOptions),
    [OPENROUTER_OPTIONS_KEY]: openrouterOptions as JSONObject,
  };
}

/**
 * Attach the neutral router block to caller provider options.
 */
export function withRouterProviderOptions(
  providerOptions: SharedV3ProviderOptions | undefined,
  router: RouterProviderOptions
): SharedV3ProviderOptions {
  const existing = asObject(providerOptions?.[ROUTER_PROVIDER_OPTIONS_KEY]);
  return {
    ...providerOptions,
    [ROUTER_PROVIDER_OPTIONS_KEY]: { ...existing, ...router } as JSONObject,
  };
}
