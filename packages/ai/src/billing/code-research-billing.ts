import { calculateAiCreditCostCents } from "@notra/ai/billing/ai-credit-cost";
import {
  allowUnmeteredAiInDevelopment,
  autumn,
} from "@notra/ai/billing/autumn";
import { FEATURES } from "@notra/ai/billing/features";
import { log } from "@notra/ai/evlog";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { captureServerEvent, flushPostHogServer } from "@notra/posthog/server";

/**
 * Bills the code researcher's own model calls. They run inside a chat tool,
 * so the chat's usage hook never sees them.
 */
export async function trackCodeResearchUsage(params: {
  organizationId: string;
  usage: AgentTokenUsage;
  modelId: string;
  useMarkup?: boolean;
  chargeAiCredits?: boolean;
}): Promise<void> {
  if (
    !autumn ||
    allowUnmeteredAiInDevelopment ||
    params.chargeAiCredits !== true
  ) {
    return;
  }
  const cost = calculateAiCreditCostCents(
    params.usage,
    params.modelId,
    params.useMarkup ?? false
  );
  try {
    await autumn.track({
      customerId: params.organizationId,
      featureId: FEATURES.AI_CREDITS,
      value: cost.costCents,
      properties: {
        source: "code_research",
        model: params.usage.modelId ?? params.modelId,
        billing_basis: cost.billingBasis,
        input_tokens: params.usage.inputTokens,
        output_tokens: params.usage.outputTokens,
        cost_cents: cost.costCents,
      },
    });
    captureServerEvent({
      event: POSTHOG_EVENTS.AI_CREDITS_CHARGED,
      organizationId: params.organizationId,
      properties: {
        cost_cents: cost.costCents,
        source: "code_research",
        model: params.usage.modelId ?? params.modelId,
        billing_basis: cost.billingBasis,
        input_tokens: params.usage.inputTokens,
        output_tokens: params.usage.outputTokens,
        cache_read_tokens: params.usage.cacheReadTokens,
        cache_write_tokens: params.usage.cacheWriteTokens,
        total_tokens: params.usage.totalTokens,
      },
    });
    await flushPostHogServer();
  } catch (error) {
    log.error({
      event: "code_research.billing_failed",
      organizationId: params.organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
