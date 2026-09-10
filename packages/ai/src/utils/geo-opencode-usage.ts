import type { GeoBoxTokenUsage } from "@notra/ai/types/geo-opencode";
import type { RunCost } from "@upstash/box";

export function geoBoxTokenUsage(
  cost: RunCost,
  model: string
): GeoBoxTokenUsage {
  return {
    modelId: model,
    totalUsd: cost.totalUsd,
    computeMs: cost.computeMs,
    inputTokens: cost.inputTokens,
    inputTokenDetails: {
      noCacheTokens: Math.max(0, cost.inputTokens - cost.cachedInputTokens),
      cacheReadTokens: cost.cachedInputTokens,
      cacheWriteTokens: undefined,
    },
    outputTokens: cost.outputTokens,
    outputTokenDetails: {
      textTokens: cost.outputTokens,
      reasoningTokens: undefined,
    },
    totalTokens: cost.inputTokens + cost.outputTokens,
    cachedInputTokens: cost.cachedInputTokens,
  };
}
