import { describe, expect, test } from "bun:test";

import type { AgentTokenUsage } from "../types/agents";
import { calculateTokenCostUsd, getModelPricing } from "./token-pricing";

function usage(overrides: Partial<AgentTokenUsage> = {}): AgentTokenUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    ...overrides,
  };
}

const GPT_5_4 = "openai/gpt-5.4";

describe("model pricing", () => {
  test("bills known models at their list price", () => {
    const cost = calculateTokenCostUsd(
      usage({ inputTokens: 100_000, outputTokens: 10_000 }),
      GPT_5_4
    );
    expect(cost).toBeCloseTo((100_000 * 2.5 + 10_000 * 15) / 1_000_000);
  });

  test("falls back to default pricing for unknown models", () => {
    expect(getModelPricing("made-up/model")).toEqual(
      getModelPricing(undefined)
    );
  });
});

describe("long-context pricing", () => {
  test("uses the base rate right up to the threshold", () => {
    const cost = calculateTokenCostUsd(
      usage({ inputTokens: 272_000, outputTokens: 1000 }),
      GPT_5_4
    );
    expect(cost).toBeCloseTo((272_000 * 2.5 + 1000 * 15) / 1_000_000);
  });

  test("bills the whole request at the higher rate once the prompt crosses it", () => {
    const cost = calculateTokenCostUsd(
      usage({ inputTokens: 272_001, outputTokens: 1000 }),
      GPT_5_4
    );
    expect(cost).toBeCloseTo((272_001 * 5 + 1000 * 22.5) / 1_000_000);
  });

  test("counts cached tokens towards the prompt", () => {
    const cost = calculateTokenCostUsd(
      usage({ inputTokens: 200_000, cacheReadTokens: 100_000 }),
      GPT_5_4
    );
    expect(cost).toBeCloseTo((200_000 * 5 + 100_000 * 0.5) / 1_000_000);
  });

  test("keeps the base rate when many small calls add up past the threshold", () => {
    const cost = calculateTokenCostUsd(
      usage({
        inputTokens: 600_000,
        outputTokens: 1000,
        maxPromptTokens: 60_000,
      }),
      GPT_5_4
    );
    expect(cost).toBeCloseTo((600_000 * 2.5 + 1000 * 15) / 1_000_000);
  });

  test("applies the higher rate when one call in an aggregate crossed it", () => {
    const cost = calculateTokenCostUsd(
      usage({
        inputTokens: 600_000,
        outputTokens: 1000,
        maxPromptTokens: 300_000,
      }),
      GPT_5_4
    );
    expect(cost).toBeCloseTo((600_000 * 5 + 1000 * 22.5) / 1_000_000);
  });

  test("leaves models without a long-context tier on one rate", () => {
    const cost = calculateTokenCostUsd(
      usage({ inputTokens: 500_000 }),
      "anthropic/claude-sonnet-5"
    );
    expect(cost).toBeCloseTo((500_000 * 2) / 1_000_000);
  });
});

describe("precomputed cost", () => {
  test("bills the per-call cost instead of re-pricing the aggregate", () => {
    expect(
      calculateTokenCostUsd(
        usage({ inputTokens: 600_000, outputTokens: 4000, tokenCostUsd: 3.07 }),
        GPT_5_4
      )
    ).toBe(3.07);
  });
});
