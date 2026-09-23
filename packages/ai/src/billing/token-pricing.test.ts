import { expect, test } from "bun:test";

import { calculateTokenCostUsd } from "./token-pricing";

test("prices the GEO planner's Opus 5.5 tokens without falling back to default rates", () => {
  const usage = {
    inputTokens: 100_000,
    outputTokens: 10_000,
    cacheReadTokens: 20_000,
    cacheWriteTokens: 5_000,
    totalTokens: 135_000,
  };

  expect(calculateTokenCostUsd(usage, "anthropic/claude-opus-5.5")).toBeCloseTo(
    0.629
  );
  expect(calculateTokenCostUsd(usage, "anthropic/claude-opus-5")).toBeCloseTo(
    0.79125
  );
});
