import { createGateway } from "@ai-sdk/gateway";
import type { SharedV4ProviderMetadata } from "@ai-sdk/provider";
import type {
  GatewayAdapter,
  GatewayBalance,
  GatewayHealth,
  VercelAdapterConfig,
} from "@notra/ai/types/router";

import { isModelSupported, toVercelModelId } from "../model-ids";
import { buildVercelProviderOptions } from "../provider-options";

function parseBalance(value: unknown): number | null {
  const balance = typeof value === "number" ? value : Number(value);
  return Number.isFinite(balance) ? balance : null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function createVercelAdapter(
  config: VercelAdapterConfig
): GatewayAdapter {
  let client: ReturnType<typeof createGateway> | undefined;

  const getClient = (): ReturnType<typeof createGateway> => {
    client ??= createGateway({
      apiKey: config.apiKey,
      headers: config.headers,
      baseURL: config.baseURL,
      fetch: config.fetch,
    });
    return client;
  };

  const getBalance = async (): Promise<GatewayBalance> => {
    const credits = await getClient().getCredits();
    return { balance: parseBalance(credits.balance) };
  };

  return {
    id: "vercel",
    // Privacy flags are injected on every request by buildVercelProviderOptions.
    enforcesZdr: true,
    supportsModel: (modelId) => isModelSupported("vercel", modelId),
    mapModelId: toVercelModelId,
    createModel: (modelId) => getClient()(toVercelModelId(modelId)),
    buildProviderOptions: buildVercelProviderOptions,
    async checkHealth(): Promise<GatewayHealth> {
      try {
        await getBalance();
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
      const gateway = providerMetadata?.gateway;
      if (!gateway || typeof gateway !== "object") {
        return {};
      }
      const record = gateway as Record<string, unknown>;
      const generationId = readString(record.generationId);
      return generationId ? { generationId } : {};
    },
    async lookupRouteMetadata(generationId) {
      const generation = await getClient().getGenerationInfo({
        id: generationId,
      });
      return {
        model: generation.model,
        upstreamProvider: generation.providerName,
      };
    },
  };
}
