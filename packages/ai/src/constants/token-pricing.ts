import type { ModelPricing } from "@notra/ai/types/billing";

export const OPENAI_LONG_CONTEXT_PROMPT_TOKENS = 272_000;

export const OPENAI_GPT_5_6_SOL_PRICING: ModelPricing = {
  inputPerMillionTokens: 4,
  outputPerMillionTokens: 20,
  cacheReadPerMillionTokens: 0.4,
  cacheWritePerMillionTokens: 5,
  longContext: {
    promptTokens: OPENAI_LONG_CONTEXT_PROMPT_TOKENS,
    inputPerMillionTokens: 8,
    outputPerMillionTokens: 30,
    cacheReadPerMillionTokens: 0.8,
    cacheWritePerMillionTokens: 10,
  },
};
