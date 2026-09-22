import type { AgentTokenUsage } from "@notra/ai/types/agents";

/**
 * Usage as providers report it: `inputTokens` is the whole prompt, and the
 * cached part is broken out separately. eve passes the AI SDK shape through
 * with the details flattened, so both spellings appear.
 */
export interface ReportedTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  inputTokenDetails?: {
    noCacheTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
}

/**
 * Splits reported usage into the buckets billing prices separately. Cached
 * tokens are part of `inputTokens`, so they have to come out of it —
 * otherwise every cache hit is charged twice, at the cached *and* the full
 * rate, and the inflated prompt can trip long-context pricing.
 */
export function toAgentTokenUsage(
  usage: ReportedTokenUsage | undefined
): AgentTokenUsage {
  const details = usage?.inputTokenDetails;
  const promptTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  const cacheReadTokens =
    details?.cacheReadTokens ?? usage?.cacheReadTokens ?? 0;
  const cacheWriteTokens =
    details?.cacheWriteTokens ?? usage?.cacheWriteTokens ?? 0;
  const inputTokens =
    details?.noCacheTokens ??
    Math.max(0, promptTokens - cacheReadTokens - cacheWriteTokens);

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens: usage?.totalTokens ?? promptTokens + outputTokens,
  };
}
