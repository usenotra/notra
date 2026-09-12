import { withRouterProviderOptions } from "@notra/ai/router/provider-options";
import type { RouterProviderOptions } from "@notra/ai/types/router";
import type { generateText } from "ai";

type ProviderOptions = NonNullable<
  Parameters<typeof generateText>[0]["providerOptions"]
>;

const DEFAULT_FALLBACK_MODELS = ["anthropic/claude-sonnet-4.6"];

export function getGatewayFallbackModels(modelId?: string): string[] {
  if (!modelId) {
    return [...DEFAULT_FALLBACK_MODELS];
  }

  if (modelId.startsWith("anthropic/claude-opus-")) {
    return ["anthropic/claude-sonnet-4.6"];
  }

  if (modelId.startsWith("anthropic/")) {
    return ["anthropic/claude-haiku-4.5"];
  }

  if (modelId.startsWith("openai/")) {
    return modelId === "openai/gpt-5.4-mini"
      ? ["openai/gpt-5.4-nano"]
      : ["openai/gpt-5.4-mini"];
  }

  return DEFAULT_FALLBACK_MODELS.filter((model) => model !== modelId);
}

export const getFallbackModels = getGatewayFallbackModels;

/**
 * Attach route-neutral defaults (automatic caching + model fallback chain).
 * The router translates them into Vercel (`gateway`) or OpenRouter
 * (`openrouter`) options depending on the selected route, so call sites stay
 * gateway-agnostic. Vendor blocks such as `anthropic` or `openai` pass
 * through unchanged.
 */
export function withRouterDefaults(
  providerOptions?: ProviderOptions,
  options?: { modelId?: string; fallbackModels?: string[] }
): ProviderOptions {
  const fallbackModels =
    options?.fallbackModels ?? getGatewayFallbackModels(options?.modelId);
  const routerOptions: RouterProviderOptions = {
    caching: "auto",
    fallbackModels,
  };

  return withRouterProviderOptions(
    providerOptions,
    routerOptions
  ) as ProviderOptions;
}
