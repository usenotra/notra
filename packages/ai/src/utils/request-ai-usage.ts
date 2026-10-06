import type { SharedV4ProviderMetadata } from "@ai-sdk/provider";
import { ROUTER_METADATA_KEY } from "@notra/ai/constants/router";
import { getOpenRequestLogger } from "@notra/ai/utils/evlog-request";

type RequestLogger = NonNullable<ReturnType<typeof getOpenRequestLogger>>;

interface RequestAIUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  costUsd: number;
  models: Set<string>;
}

export interface ModelCallUsage {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
  providerMetadata?: SharedV4ProviderMetadata;
}

const MICRO_USD = 1_000_000;

const usageByRequest = new WeakMap<RequestLogger, RequestAIUsage>();

function routeCostUsd(
  providerMetadata: SharedV4ProviderMetadata | undefined
): number {
  const cost = providerMetadata?.[ROUTER_METADATA_KEY]?.costUsd;
  return typeof cost === "number" && Number.isFinite(cost) && cost >= 0
    ? cost
    : 0;
}

/**
 * Roll a finished model call up into the current request's wide event as the
 * `ai` field (same shape evlog/ai writes), so tokens and cost sit next to the
 * route, feature and organization that spent them. The per-call
 * `ai.call.completed` event stays the detailed record.
 */
export function recordRequestAIUsage(call: ModelCallUsage): void {
  const logger = getOpenRequestLogger();
  if (!logger) {
    return;
  }
  const usage = usageByRequest.get(logger) ?? {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    costUsd: 0,
    models: new Set<string>(),
  };
  usageByRequest.set(logger, usage);

  const inputTokens = call.inputTokens ?? 0;
  const outputTokens = call.outputTokens ?? 0;
  usage.calls += 1;
  usage.inputTokens += inputTokens;
  usage.outputTokens += outputTokens;
  usage.totalTokens += inputTokens + outputTokens;
  usage.cacheReadTokens += call.cacheReadTokens ?? 0;
  usage.cacheWriteTokens += call.cacheWriteTokens ?? 0;
  usage.reasoningTokens += call.reasoningTokens ?? 0;
  usage.costUsd += routeCostUsd(call.providerMetadata);
  // evlog concatenates arrays on set(), so only hand it models it hasn't seen.
  const newModel = !usage.models.has(call.model);
  usage.models.add(call.model);

  logger.set({
    ai: {
      calls: usage.calls,
      model: call.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      reasoningTokens: usage.reasoningTokens,
      ...(usage.costUsd > 0
        ? { costUsd: Math.round(usage.costUsd * MICRO_USD) / MICRO_USD }
        : {}),
      ...(newModel ? { models: [call.model] } : {}),
    },
  });
}
