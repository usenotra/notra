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
  hasReportedCost: boolean;
  models: Set<string>;
  /** Generations whose gateway-reported cost is already in `costUsd`. */
  costedGenerations: Set<string>;
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

function routeInfo(providerMetadata: SharedV4ProviderMetadata | undefined): {
  costUsd?: number;
  generationId?: string;
  model?: string;
} {
  const route = providerMetadata?.[ROUTER_METADATA_KEY];
  const record =
    route && typeof route === "object" && !Array.isArray(route) ? route : {};
  const { costUsd, generationId, model } = record;
  return {
    costUsd:
      typeof costUsd === "number" && Number.isFinite(costUsd) && costUsd >= 0
        ? costUsd
        : undefined,
    ...(typeof generationId === "string" ? { generationId } : {}),
    ...(typeof model === "string" ? { model } : {}),
  };
}

function usageFor(logger: RequestLogger): RequestAIUsage {
  const existing = usageByRequest.get(logger);
  if (existing) {
    return existing;
  }
  const usage: RequestAIUsage = {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    costUsd: 0,
    hasReportedCost: false,
    models: new Set<string>(),
    costedGenerations: new Set<string>(),
  };
  usageByRequest.set(logger, usage);
  return usage;
}

function roundedCost(usage: RequestAIUsage) {
  return usage.hasReportedCost
    ? { costUsd: Math.round(usage.costUsd * MICRO_USD) / MICRO_USD }
    : {};
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
  const usage = usageFor(logger);
  const route = routeInfo(call.providerMetadata);
  // The router metadata names the model that answered, which differs from the
  // requested one when OpenRouter served a fallback.
  const model = route.model ?? call.model;
  const inputTokens = call.inputTokens ?? 0;
  const outputTokens = call.outputTokens ?? 0;
  usage.calls += 1;
  usage.inputTokens += inputTokens;
  usage.outputTokens += outputTokens;
  usage.totalTokens += inputTokens + outputTokens;
  usage.cacheReadTokens += call.cacheReadTokens ?? 0;
  usage.cacheWriteTokens += call.cacheWriteTokens ?? 0;
  usage.reasoningTokens += call.reasoningTokens ?? 0;
  if (
    route.costUsd !== undefined &&
    (!route.generationId || !usage.costedGenerations.has(route.generationId))
  ) {
    usage.costUsd += route.costUsd;
    usage.hasReportedCost = true;
    if (route.generationId) {
      usage.costedGenerations.add(route.generationId);
    }
  }
  // evlog concatenates arrays on set(), so only hand it models it hasn't seen.
  const newModel = !usage.models.has(model);
  usage.models.add(model);

  try {
    logger.set({
      ai: {
        calls: usage.calls,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        cacheReadTokens: usage.cacheReadTokens,
        cacheWriteTokens: usage.cacheWriteTokens,
        reasoningTokens: usage.reasoningTokens,
        ...roundedCost(usage),
        ...(newModel ? { models: [model] } : {}),
      },
    });
  } catch {
    // A logging sink failure must never retry an already completed model call.
  }
}

/**
 * Vercel reports cost only through the generation lookup that billing already
 * runs after a call. Add that cost when it lands while the request event is
 * still open; no extra lookup is made for observability.
 */
export function recordRequestAICost(
  generationId: string,
  costUsd: number
): void {
  const logger = getOpenRequestLogger();
  if (!logger || !Number.isFinite(costUsd) || costUsd < 0) {
    return;
  }
  const usage = usageFor(logger);
  if (usage.costedGenerations.has(generationId)) {
    return;
  }
  usage.costedGenerations.add(generationId);
  usage.costUsd += costUsd;
  usage.hasReportedCost = true;
  try {
    logger.set({ ai: roundedCost(usage) });
  } catch {
    // Cost enrichment remains authoritative even when request logging fails.
  }
}
