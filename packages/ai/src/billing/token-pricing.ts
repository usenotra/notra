import type { Balance } from "autumn-js";

import type { AgentTokenUsage } from "../types/agents";
import type { ModelPricing } from "../types/billing";

/** OpenAI charges double above this prompt size on its long-context models. */
const OPENAI_LONG_CONTEXT_PROMPT_TOKENS = 272_000;

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

const CLAUDE_FABLE_5_1_PRICING: ModelPricing = {
  inputPerMillionTokens: 10.0,
  outputPerMillionTokens: 50.0,
  cacheReadPerMillionTokens: 0.25,
  cacheWritePerMillionTokens: 12.5,
};

const CLAUDE_FABLE_5_PRICING: ModelPricing = {
  inputPerMillionTokens: 10.0,
  outputPerMillionTokens: 50.0,
  cacheReadPerMillionTokens: 1.0,
  cacheWritePerMillionTokens: 12.5,
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "anthropic/claude-fable-5.1": CLAUDE_FABLE_5_1_PRICING,
  // Claude Code reports Fable 5.1 usage with the dashed id.
  "anthropic/claude-fable-5-1": CLAUDE_FABLE_5_1_PRICING,
  "anthropic/claude-fable-5": CLAUDE_FABLE_5_PRICING,
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
    inputPerMillionTokens: 1.0,
    outputPerMillionTokens: 5.0,
    cacheReadPerMillionTokens: 0.1,
    cacheWritePerMillionTokens: 1.25,
  },
  "openai/gpt-5.4": {
    inputPerMillionTokens: 2.5,
    outputPerMillionTokens: 15.0,
    cacheReadPerMillionTokens: 0.25,
    cacheWritePerMillionTokens: 0,
    longContext: {
      promptTokens: OPENAI_LONG_CONTEXT_PROMPT_TOKENS,
      inputPerMillionTokens: 5.0,
      outputPerMillionTokens: 22.5,
      cacheReadPerMillionTokens: 0.5,
      cacheWritePerMillionTokens: 0,
    },
  },
  "openai/gpt-5.4-mini": {
    inputPerMillionTokens: 0.75,
    outputPerMillionTokens: 4.5,
    cacheReadPerMillionTokens: 0.075,
    cacheWritePerMillionTokens: 0,
  },
  "openai/gpt-5.4-nano": {
    inputPerMillionTokens: 0.2,
    outputPerMillionTokens: 1.25,
    cacheReadPerMillionTokens: 0.02,
    cacheWritePerMillionTokens: 0,
  },
  "openai/gpt-6-astra": {
    inputPerMillionTokens: 10.0,
    outputPerMillionTokens: 50.0,
    cacheReadPerMillionTokens: 1.0,
    cacheWritePerMillionTokens: 12.5,
    longContext: {
      promptTokens: OPENAI_LONG_CONTEXT_PROMPT_TOKENS,
      inputPerMillionTokens: 20.0,
      outputPerMillionTokens: 75.0,
      cacheReadPerMillionTokens: 2.0,
      cacheWritePerMillionTokens: 25.0,
    },
  },
  "google/gemini-3.8-flash": {
    inputPerMillionTokens: 0.75,
    outputPerMillionTokens: 3.75,
    cacheReadPerMillionTokens: 0.075,
    cacheWritePerMillionTokens: 0,
  },
  "openai/gpt-5.5": {
    inputPerMillionTokens: 5.0,
    outputPerMillionTokens: 30.0,
    cacheReadPerMillionTokens: 0.5,
    cacheWritePerMillionTokens: 0,
    longContext: {
      promptTokens: OPENAI_LONG_CONTEXT_PROMPT_TOKENS,
      inputPerMillionTokens: 10.0,
      outputPerMillionTokens: 45.0,
      cacheReadPerMillionTokens: 1.0,
      cacheWritePerMillionTokens: 0,
    },
  },
  "openai/gpt-5.6-luna": {
    inputPerMillionTokens: 0.2,
    outputPerMillionTokens: 1.2,
    cacheReadPerMillionTokens: 0.02,
    cacheWritePerMillionTokens: 0.25,
    longContext: {
      promptTokens: OPENAI_LONG_CONTEXT_PROMPT_TOKENS,
      inputPerMillionTokens: 0.4,
      outputPerMillionTokens: 1.8,
      cacheReadPerMillionTokens: 0.04,
      cacheWritePerMillionTokens: 0.5,
    },
  },
  "openai/gpt-5.6-terra": {
    inputPerMillionTokens: 2.0,
    outputPerMillionTokens: 12.0,
    cacheReadPerMillionTokens: 0.2,
    cacheWritePerMillionTokens: 2.5,
    longContext: {
      promptTokens: OPENAI_LONG_CONTEXT_PROMPT_TOKENS,
      inputPerMillionTokens: 4.0,
      outputPerMillionTokens: 18.0,
      cacheReadPerMillionTokens: 0.4,
      cacheWritePerMillionTokens: 5.0,
    },
  },
  "openai/gpt-5.6-sol": {
    inputPerMillionTokens: 2.0,
    outputPerMillionTokens: 10.0,
    cacheReadPerMillionTokens: 0.2,
    cacheWritePerMillionTokens: 2.5,
    longContext: {
      promptTokens: OPENAI_LONG_CONTEXT_PROMPT_TOKENS,
      inputPerMillionTokens: 4.0,
      outputPerMillionTokens: 15.0,
      cacheReadPerMillionTokens: 0.4,
      cacheWritePerMillionTokens: 5.0,
    },
  },
  "openai/gpt-oss-120b": {
    inputPerMillionTokens: 0.1,
    outputPerMillionTokens: 0.5,
    cacheReadPerMillionTokens: 0.05,
    cacheWritePerMillionTokens: 0,
  },
  "zai/glm-5.3-flash": {
    inputPerMillionTokens: 0.15,
    outputPerMillionTokens: 0.5,
    cacheReadPerMillionTokens: 0.03,
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
  if (usage.tokenCostUsd !== undefined) {
    return usage.tokenCostUsd;
  }

  const pricing = resolvePricingTier(getModelPricing(modelId), usage);

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

/** Everything the model read for one call: fresh, cache-read and cache-write. */
export function promptTokensOf(usage: AgentTokenUsage): number {
  return (
    usage.maxPromptTokens ??
    usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
  );
}

/**
 * Long-context rates apply to the whole request once its prompt crosses the
 * threshold. Usage that aggregates several calls has to carry
 * `maxPromptTokens`, otherwise the sum of small calls would look like one
 * long one.
 */
function resolvePricingTier(
  pricing: ModelPricing,
  usage: AgentTokenUsage
): ModelPricing {
  const { longContext } = pricing;
  if (!longContext || promptTokensOf(usage) <= longContext.promptTokens) {
    return pricing;
  }
  return longContext;
}
