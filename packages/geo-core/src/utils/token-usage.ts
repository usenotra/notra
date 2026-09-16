import { calculateTokenCostUsd } from "@notra/ai/billing/token-pricing";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { LanguageModelUsage } from "ai";

import { GEO_JUDGE_MODEL } from "../constants/geo";
import type { GeoTokenUsageInput } from "../types/token-usage";

export const EMPTY_AGENT_TOKEN_USAGE: AgentTokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  totalUsd: 0,
};

function addTokenCounts(
  first: number | undefined,
  second: number | undefined
): number | undefined {
  return first === undefined && second === undefined
    ? undefined
    : (first ?? 0) + (second ?? 0);
}

export function addLanguageModelTokenUsage(
  first: LanguageModelUsage,
  second: LanguageModelUsage
): LanguageModelUsage {
  return {
    inputTokens: addTokenCounts(first.inputTokens, second.inputTokens),
    inputTokenDetails: {
      noCacheTokens: addTokenCounts(
        first.inputTokenDetails.noCacheTokens,
        second.inputTokenDetails.noCacheTokens
      ),
      cacheReadTokens: addTokenCounts(
        first.inputTokenDetails.cacheReadTokens,
        second.inputTokenDetails.cacheReadTokens
      ),
      cacheWriteTokens: addTokenCounts(
        first.inputTokenDetails.cacheWriteTokens,
        second.inputTokenDetails.cacheWriteTokens
      ),
    },
    outputTokens: addTokenCounts(first.outputTokens, second.outputTokens),
    outputTokenDetails: {
      textTokens: addTokenCounts(
        first.outputTokenDetails.textTokens,
        second.outputTokenDetails.textTokens
      ),
      reasoningTokens: addTokenCounts(
        first.outputTokenDetails.reasoningTokens,
        second.outputTokenDetails.reasoningTokens
      ),
    },
    totalTokens: addTokenCounts(first.totalTokens, second.totalTokens),
  };
}

function normalizeTokenUsage(usage: GeoTokenUsageInput): AgentTokenUsage {
  const cacheReadTokens =
    usage.inputTokenDetails?.cacheReadTokens ?? usage.cacheReadTokens ?? 0;
  const cacheWriteTokens =
    usage.inputTokenDetails?.cacheWriteTokens ?? usage.cacheWriteTokens ?? 0;
  const rawInputTokens = usage.inputTokens ?? 0;
  const inputTokens = usage.inputTokenDetails
    ? Math.max(0, rawInputTokens - cacheReadTokens - cacheWriteTokens)
    : rawInputTokens;
  return {
    ...usage,
    inputTokens,
    outputTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? 0,
    cacheReadTokens,
    cacheWriteTokens,
  };
}

function usageCostUsd(usage: AgentTokenUsage): number {
  if (
    typeof usage.totalUsd === "number" &&
    Number.isFinite(usage.totalUsd) &&
    usage.totalUsd > 0
  ) {
    return usage.totalUsd;
  }
  return calculateTokenCostUsd(usage, usage.modelId ?? GEO_JUDGE_MODEL);
}

export function addAgentTokenUsage(
  total: AgentTokenUsage,
  usage: GeoTokenUsageInput
): AgentTokenUsage {
  const next = normalizeTokenUsage(usage);
  return {
    inputTokens: total.inputTokens + next.inputTokens,
    outputTokens: total.outputTokens + next.outputTokens,
    totalTokens: total.totalTokens + next.totalTokens,
    cacheReadTokens: total.cacheReadTokens + next.cacheReadTokens,
    cacheWriteTokens: total.cacheWriteTokens + next.cacheWriteTokens,
    totalUsd: usageCostUsd(total) + usageCostUsd(next),
  };
}
