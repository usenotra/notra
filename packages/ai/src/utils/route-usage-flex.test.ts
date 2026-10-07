import { expect, test } from "bun:test";

import { calculateAiCreditCostCents } from "@notra/ai/billing/ai-credit-cost";
import { calculateTokenCostUsd } from "@notra/ai/billing/token-pricing";

import { summarizeRouteUsage } from "./route-usage";

test.each([
  ["openai/gpt-6-sol", 0.002],
  ["openai/gpt-6-astra", 0.01],
  ["openai/gpt-5.6-sol", 0.004],
] as const)(
  "prices direct %s by the confirmed tier, not the requested tier",
  async (modelId, standardCost) => {
    for (const serviceTier of ["flex", "default", undefined]) {
      const result = await summarizeRouteUsage(
        [
          {
            providerMetadata: { openai: serviceTier ? { serviceTier } : {} },
            usage: { inputTokens: 1000, outputTokens: 0 },
          },
        ],
        modelId
      );
      expect(result.tokenCostUsd).toBeCloseTo(
        standardCost * (serviceTier === "flex" ? 0.5 : 1),
        8
      );
    }
  }
);

test("gateway fallback estimates use the granted Flex tier and preserve reported costs", async () => {
  for (const costUsd of [undefined, 0.007]) {
    const result = await summarizeRouteUsage(
      [
        {
          providerMetadata: {
            gateway: { serviceTier: "flex" },
            notraRouter: {
              gateway: "vercel",
              requestedModel: "openai/gpt-6-sol",
              model: "openai/gpt-6-sol",
              reason: "paid",
              zdrEnforced: true,
              ...(costUsd === undefined ? {} : { costUsd }),
            },
          },
          usage: { inputTokens: 1000, outputTokens: 0 },
        },
      ],
      "openai/gpt-6-sol"
    );
    expect(result.tokenCostUsd).toBeCloseTo(costUsd ?? 0.001, 8);
  }
});

test("Flex pricing retains cache buckets and long-context premiums", () => {
  const usage = {
    inputTokens: 300_000,
    outputTokens: 10_000,
    cacheReadTokens: 1000,
    cacheWriteTokens: 2000,
    totalTokens: 313_000,
  };
  const standard = calculateTokenCostUsd(usage, "openai/gpt-6-sol", "direct");
  expect(standard).toBeCloseTo(1.3604, 8);
  expect(
    calculateTokenCostUsd(usage, "openai/gpt-6-sol", "direct", "flex")
  ).toBeCloseTo(standard / 2, 8);
  expect(
    calculateTokenCostUsd(
      { ...usage, tokenCostUsd: 0.7 },
      "openai/gpt-6-sol",
      "direct",
      "flex"
    )
  ).toBe(0.7);
});

test("OpenRouter pricing is not discounted by another provider's Flex metadata", async () => {
  const result = await summarizeRouteUsage(
    [
      {
        providerMetadata: {
          openai: { serviceTier: "flex" },
          notraRouter: {
            gateway: "openrouter",
            requestedModel: "openai/gpt-6-sol",
            model: "openai/gpt-6-sol",
            reason: "free",
            zdrEnforced: true,
          },
        },
        usage: { inputTokens: 1000, outputTokens: 0 },
      },
    ],
    "openai/gpt-6-sol"
  );
  expect(result.tokenCostUsd).toBeCloseTo(0.002, 8);
});

test("customer credits use the corrected per-call total", async () => {
  const result = await summarizeRouteUsage(
    [
      {
        providerMetadata: { openai: { serviceTier: "flex" } },
        usage: { inputTokens: 100_000, outputTokens: 0 },
      },
    ],
    "openai/gpt-6-sol"
  );
  const billed = calculateAiCreditCostCents(
    {
      inputTokens: 100_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 100_000,
      totalUsd: result.tokenCostUsd,
    },
    "openai/gpt-6-sol",
    false
  );
  expect(billed.costCents).toBe(10);
});
