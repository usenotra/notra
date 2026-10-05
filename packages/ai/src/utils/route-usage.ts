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
import { toAgentTokenUsage } from "@notra/ai/utils/token-usage";

/** One step's usage in the shape the pricing helpers expect. */
function stepUsage(step: RouteUsageStep): AgentTokenUsage | undefined {
  return step.usage ? toAgentTokenUsage(step.usage) : undefined;
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
    const routeMetadata = getRouteMetadata(step.providerMetadata);
    const stepRoute = routeMetadata
      ? await enrichRouteMetadata(routeMetadata)
      : undefined;
    if (stepRoute) {
      route = stepRoute;
    }

    const usage = stepUsage(step);
    if (usage) {
      maxPromptTokens = Math.max(maxPromptTokens, promptTokensOf(usage));
    }
    if (
      typeof stepRoute?.costUsd === "number" &&
      Number.isFinite(stepRoute.costUsd) &&
      stepRoute.costUsd >= 0
    ) {
      pricedSteps += 1;
      tokenCostUsd += stepRoute.costUsd;
    } else if (usage) {
      pricedSteps += 1;
      tokenCostUsd += calculateTokenCostUsd(
        usage,
        stepRoute?.model ?? modelId,
        stepRoute?.gateway
      );
    }
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
