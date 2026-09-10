import type { Balance } from "autumn-js";

import type { AgentTokenUsage } from "../types/agents";
import type { ModelPricing } from "../types/billing";

const CLAUDE_SONNET_4_6_PRICING: ModelPricing = {
  inputPerMillionTokens: 3.0,
  outputPerMillionTokens: 15.0,
  cacheReadPerMillionTokens: 0.3,
  cacheWritePerMillionTokens: 3.75,
};

const CLAUDE_SONNET_5_PRICING: ModelPricing = {
  inputPerMillionTokens: 2.0,
  outputPerMillionTokens: 10.0,
  cacheReadPerMillionTokens: 0.2,
  cacheWritePerMillionTokens: 2.5,
};

const CLAUDE_OPUS_5_PRICING: ModelPricing = {
  inputPerMillionTokens: 5.0,
  outputPerMillionTokens: 25.0,
  cacheReadPerMillionTokens: 0.5,
  cacheWritePerMillionTokens: 6.25,
};

const CLAUDE_OPUS_4_8_PRICING: ModelPricing = {
  inputPerMillionTokens: 5.0,
  outputPerMillionTokens: 25.0,
  cacheReadPerMillionTokens: 0.5,
  cacheWritePerMillionTokens: 6.25,
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "opencode/claude-opus-5": CLAUDE_OPUS_5_PRICING,
  "anthropic/claude-opus-5": CLAUDE_OPUS_5_PRICING,
  "vercel/anthropic/claude-opus-5": CLAUDE_OPUS_5_PRICING,
  "opencode/claude-opus-4-8": CLAUDE_OPUS_4_8_PRICING,
  "anthropic/claude-opus-4.8": CLAUDE_OPUS_4_8_PRICING,
  "vercel/anthropic/claude-opus-4.8": CLAUDE_OPUS_4_8_PRICING,
  "opencode/claude-sonnet-4-6": CLAUDE_SONNET_4_6_PRICING,
  "anthropic/claude-sonnet-4.6": CLAUDE_SONNET_4_6_PRICING,
  "vercel/anthropic/claude-sonnet-4.6": CLAUDE_SONNET_4_6_PRICING,
  "opencode/claude-sonnet-5": CLAUDE_SONNET_5_PRICING,
  "anthropic/claude-sonnet-5": CLAUDE_SONNET_5_PRICING,
  "vercel/anthropic/claude-sonnet-5": CLAUDE_SONNET_5_PRICING,
  "anthropic/claude-haiku-4.5": {
    inputPerMillionTokens: 0.8,
    outputPerMillionTokens: 4.0,
    cacheReadPerMillionTokens: 0.08,
    cacheWritePerMillionTokens: 1.0,
  },
  "openai/gpt-5.4-mini": {
    inputPerMillionTokens: 0.1,
    outputPerMillionTokens: 0.4,
    cacheReadPerMillionTokens: 0.05,
    cacheWritePerMillionTokens: 0,
  },
  "openai/gpt-oss-120b": {
    inputPerMillionTokens: 0.1,
    outputPerMillionTokens: 0.4,
    cacheReadPerMillionTokens: 0.05,
    cacheWritePerMillionTokens: 0,
  },
};

const DEFAULT_PRICING: ModelPricing = {
  inputPerMillionTokens: 1.0,
  outputPerMillionTokens: 4.0,
  cacheReadPerMillionTokens: 0.1,
  cacheWritePerMillionTokens: 1.0,
};

export const MARKUP_PERCENT = 10;
const MARKUP_MULTIPLIER = 1 + MARKUP_PERCENT / 100;

const MINIMUM_COST_CENTS = 1;

export function calculateTokenCostCents(
  usage: AgentTokenUsage,
  modelId?: string,
  applyMarkup = true
): number {
  const baseCostDollars = calculateTokenCostUsd(usage, modelId);

  const multiplier = applyMarkup ? MARKUP_MULTIPLIER : 1;
  const costCents = Math.ceil(baseCostDollars * multiplier * 100);

  return Math.max(costCents, MINIMUM_COST_CENTS);
}

/** Unrounded token cost; round and apply markup only when settling the total. */
export function calculateTokenCostUsd(
  usage: AgentTokenUsage,
  modelId?: string
): number {
  const pricing = getModelPricing(modelId);

  const inputCostDollars =
    (usage.inputTokens / 1_000_000) * pricing.inputPerMillionTokens;
  const outputCostDollars =
    (usage.outputTokens / 1_000_000) * pricing.outputPerMillionTokens;
  const cacheReadCostDollars =
    (usage.cacheReadTokens / 1_000_000) * pricing.cacheReadPerMillionTokens;
  const cacheWriteCostDollars =
    (usage.cacheWriteTokens / 1_000_000) * pricing.cacheWritePerMillionTokens;

  return (
    inputCostDollars +
    outputCostDollars +
    cacheReadCostDollars +
    cacheWriteCostDollars
  );
}

export function shouldApplyMarkup(balance: Balance | null): boolean {
  if (!balance || balance.remaining <= 0) {
    return false;
  }

  if (balance.breakdown?.length) {
    const hasRemainingPlanCredits = balance.breakdown.some(
      (entry) => entry.remaining > 0 && entry.reset?.interval !== "one_off"
    );
    return !hasRemainingPlanCredits;
  }

  return false;
}

export function getModelPricing(modelId?: string): ModelPricing {
  return (modelId && MODEL_PRICING[modelId]) || DEFAULT_PRICING;
}
