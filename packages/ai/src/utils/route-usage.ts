import {
  calculateTokenCostUsd,
  promptTokensOf,
} from "@notra/ai/billing/token-pricing";
import { enrichRouteMetadata, getRouteMetadata } from "@notra/ai/gateway";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type {
  RouteMetadata,
  RouteUsageStep,
  RouteUsageSummary,
} from "@notra/ai/types/router";

/** One step's usage in the shape the pricing helpers expect. */
function stepUsage(step: RouteUsageStep): AgentTokenUsage | undefined {
  const { usage } = step;
  if (!usage) {
    return undefined;
  }
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const cacheReadTokens = usage.inputTokenDetails?.cacheReadTokens ?? 0;
  const cacheWriteTokens = usage.inputTokenDetails?.cacheWriteTokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens:
      inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
  };
}

/**
 * Collect router metadata from the steps of a generate/stream result so
 * usage sinks can record the selected gateway.
 */
export async function summarizeRouteUsage(
  steps: readonly RouteUsageStep[] | undefined,
  modelId?: string
): Promise<RouteUsageSummary> {
  if (!steps || steps.length === 0) {
    return {};
  }

  let route: RouteMetadata | undefined;
  let maxPromptTokens = 0;
  let tokenCostUsd = 0;
  let pricedSteps = 0;

  for (const step of steps) {
    const usage = stepUsage(step);
    if (usage) {
      pricedSteps += 1;
      maxPromptTokens = Math.max(maxPromptTokens, promptTokensOf(usage));
      tokenCostUsd += calculateTokenCostUsd(usage, modelId);
    }
    const routeMetadata = getRouteMetadata(step.providerMetadata);
    if (!routeMetadata) {
      continue;
    }
    const metadata = await enrichRouteMetadata(routeMetadata);
    route = metadata;
  }

  if (pricedSteps === 0) {
    return { route };
  }

  return { route, maxPromptTokens, tokenCostUsd };
}

/**
 * Flatten route metadata into snake_case properties for billing/usage events.
 */
export function routeUsageProperties(summary: RouteUsageSummary | undefined) {
  if (!summary?.route) {
    return {};
  }
  const { route } = summary;
  return {
    gateway: route.gateway,
    upstream_provider: route.upstreamProvider,
    route_reason: route.reason,
    fallback_from: route.fallbackFrom,
    fallback_reason: route.fallbackReason,
  };
}
