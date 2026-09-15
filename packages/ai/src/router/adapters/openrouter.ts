import type { SharedV4ProviderMetadata } from "@ai-sdk/provider";
import {
  DEFAULT_OPENROUTER_ACCOUNT_BASE_URL,
  OPENROUTER_PRIVACY_PROVIDER_ROUTING,
} from "@notra/ai/constants/router";
import type {
  GatewayAdapter,
  GatewayBalance,
  GatewayHealth,
  OpenRouterAdapterConfig,
} from "@notra/ai/types/router";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { isModelSupported, toOpenRouterModelId } from "../model-ids";
import { buildOpenRouterProviderOptions } from "../provider-options";

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function createOpenRouterAdapter(
  config: OpenRouterAdapterConfig
): GatewayAdapter {
  let client: ReturnType<typeof createOpenRouter> | undefined;
  const fetchImpl = config.fetch ?? fetch;
  const accountBaseURL =
    config.accountBaseURL ?? DEFAULT_OPENROUTER_ACCOUNT_BASE_URL;

  const getClient = (): ReturnType<typeof createOpenRouter> => {
    client ??= createOpenRouter({
      apiKey: config.apiKey,
      headers: config.headers,
      baseURL: config.baseURL,
      fetch: config.fetch,
      compatibility: "strict",
      extraBody: { provider: OPENROUTER_PRIVACY_PROVIDER_ROUTING },
    });
    return client;
  };

  const accountRequest = async (path: string): Promise<unknown> => {
    const response = await fetchImpl(`${accountBaseURL}${path}`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    if (!response.ok) {
      throw new Error(
        `OpenRouter ${path} responded with ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  };

  const getBalance = async (): Promise<GatewayBalance> => {
    const payload = (await accountRequest("/credits")) as {
      data?: { total_credits?: unknown; total_usage?: unknown };
    };
    const totalCredits = readNumber(payload.data?.total_credits);
    const totalUsage = readNumber(payload.data?.total_usage);
    if (totalCredits === undefined || totalUsage === undefined) {
      return { balance: null };
    }
    return { balance: totalCredits - totalUsage };
  };

  return {
    id: "openrouter",
    enforcesZdr: true,
    supportsModel: (modelId) => isModelSupported("openrouter", modelId),
    mapModelId: toOpenRouterModelId,
    createModel: (modelId) =>
      getClient().chat(toOpenRouterModelId(modelId), {
        usage: { include: true },
        provider: { ...OPENROUTER_PRIVACY_PROVIDER_ROUTING },
      }),
    buildProviderOptions: buildOpenRouterProviderOptions,
    async checkHealth(): Promise<GatewayHealth> {
      try {
        await accountRequest("/key");
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          reason: error instanceof Error ? error.message : "unknown error",
        };
      }
    },
    getBalance,
    extractRouteMetadata(
      providerMetadata: SharedV4ProviderMetadata | undefined
    ) {
      const openrouter = providerMetadata?.openrouter;
      if (!openrouter || typeof openrouter !== "object") {
        return {};
      }
      const record = openrouter as Record<string, unknown>;
      return {
        upstreamProvider:
          typeof record.provider === "string" && record.provider.length > 0
            ? record.provider
            : undefined,
      };
    },
  };
}
