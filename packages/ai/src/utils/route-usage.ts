import {
  calculateTokenCostUsd,
  promptTokensOf,
} from "@notra/ai/billing/token-pricing";
import { ROUTE_USAGE_LOOKUP_CONCURRENCY } from "@notra/ai/constants/router";
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
  let reportedCostUsd = 0;
  let estimatedCostUsd = 0;
  let reportedSteps = 0;
  let estimatedSteps = 0;
  let gatewayCostUsd: number | undefined;
  let upstreamInferenceCostUsd: number | undefined;

  for (
    let offset = 0;
    offset < steps.length;
    offset += ROUTE_USAGE_LOOKUP_CONCURRENCY
  ) {
    const batch = steps.slice(offset, offset + ROUTE_USAGE_LOOKUP_CONCURRENCY);
    const routes = await Promise.all(
      batch.map((step) => {
        const metadata = getRouteMetadata(step.providerMetadata);
        return metadata ? enrichRouteMetadata(metadata) : undefined;
      })
    );
    for (const [index, step] of batch.entries()) {
      const stepRoute = routes[index];
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
        tokenCostUsd += stepRoute.costUsd;
        reportedCostUsd += stepRoute.costUsd;
        reportedSteps += 1;
        if (
          typeof stepRoute.gatewayCostUsd === "number" &&
          Number.isFinite(stepRoute.gatewayCostUsd) &&
          stepRoute.gatewayCostUsd >= 0
        ) {
          gatewayCostUsd = (gatewayCostUsd ?? 0) + stepRoute.gatewayCostUsd;
        }
        if (
          typeof stepRoute.upstreamInferenceCostUsd === "number" &&
          Number.isFinite(stepRoute.upstreamInferenceCostUsd) &&
          stepRoute.upstreamInferenceCostUsd >= 0
        ) {
          upstreamInferenceCostUsd =
            (upstreamInferenceCostUsd ?? 0) +
            stepRoute.upstreamInferenceCostUsd;
        }
      } else if (usage) {
        const serviceTier =
          step.providerMetadata?.gateway?.serviceTier ??
          step.providerMetadata?.openai?.serviceTier;
        const estimatedCost = calculateTokenCostUsd(
          usage,
          stepRoute?.model ?? modelId,
          stepRoute?.gateway ?? "direct",
          typeof serviceTier === "string" ? serviceTier : undefined
        );
        if (Number.isFinite(estimatedCost) && estimatedCost >= 0) {
          tokenCostUsd += estimatedCost;
          estimatedCostUsd += estimatedCost;
          estimatedSteps += 1;
        }
      }
    }
  }

  if (reportedSteps === 0 && estimatedSteps === 0) {
    return { route };
  }

  let costSource: RouteUsageSummary["costSource"] =
    reportedSteps > 0 ? "reported" : "estimated";
  if (reportedSteps > 0 && estimatedSteps > 0) {
    costSource = "mixed";
  }

  return {
    route,
    maxPromptTokens,
    tokenCostUsd,
    costSource,
    reportedCostUsd,
    estimatedCostUsd,
    reportedSteps,
    estimatedSteps,
    ...(gatewayCostUsd === undefined ? {} : { gatewayCostUsd }),
    ...(upstreamInferenceCostUsd === undefined
      ? {}
      : { upstreamInferenceCostUsd }),
  };
}

/**
 * Flatten last-call identity and known reported component subtotals for billing
 * events. Component subtotals may be partial when steps lack a breakdown.
 */
export function routeUsageProperties(summary: RouteUsageSummary | undefined) {
  if (!summary) {
    return {};
  }
  const { route } = summary;
  return {
    ...(route
      ? {
          gateway: route.gateway,
          upstream_provider: route.upstreamProvider,
          route_reason: route.reason,
          fallback_from: route.fallbackFrom,
          fallback_reason: route.fallbackReason,
          ...(route.isByok === undefined ? {} : { is_byok: route.isByok }),
        }
      : {}),
    ...(summary.costSource === undefined
      ? {}
      : {
          cost_source: summary.costSource,
          reported_cost_usd: summary.reportedCostUsd,
          estimated_cost_usd: summary.estimatedCostUsd,
          reported_steps: summary.reportedSteps,
          estimated_steps: summary.estimatedSteps,
        }),
    ...(summary.gatewayCostUsd === undefined
      ? {}
      : { gateway_cost_usd: summary.gatewayCostUsd }),
    ...(summary.upstreamInferenceCostUsd === undefined
      ? {}
      : { upstream_inference_cost_usd: summary.upstreamInferenceCostUsd }),
  };
}
