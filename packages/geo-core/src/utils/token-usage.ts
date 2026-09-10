import { calculateTokenCostUsd } from "@notra/ai/billing/token-pricing";
import type { AgentTokenUsage } from "@notra/ai/types/agents";

import { GEO_JUDGE_MODEL } from "../constants/geo";
import type { GeoTokenUsageInput } from "../types/token-usage";

export const EMPTY_AGENT_TOKEN_USAGE: AgentTokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

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
