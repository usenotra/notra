import type { GeoBoxTokenUsage } from "@notra/ai/types/geo-opencode";
import type { RunCost } from "@upstash/box";

export function geoBoxTokenUsage(
  cost: RunCost,
  model: string
): GeoBoxTokenUsage {
  return {
    modelId: model,
    ...(Number.isFinite(cost.totalUsd) &&
    (cost.totalUsd > 0 ||
      (cost.totalUsd === 0 &&
        cost.inputTokens === 0 &&
        cost.outputTokens === 0 &&
        cost.cachedInputTokens === 0))
      ? { totalUsd: cost.totalUsd }
      : {}),
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
  };
}
