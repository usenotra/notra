import { describe, expect, test } from "bun:test";

import { toAgentTokenUsage } from "./token-usage";

describe("reported token usage", () => {
  test("takes cached tokens out of the prompt total", () => {
    expect(
      toAgentTokenUsage({
        inputTokens: 100_000,
        outputTokens: 500,
        inputTokenDetails: { cacheReadTokens: 80_000, cacheWriteTokens: 5000 },
      })
    ).toEqual({
      inputTokens: 15_000,
      outputTokens: 500,
      cacheReadTokens: 80_000,
      cacheWriteTokens: 5000,
      totalTokens: 100_500,
    });
  });

  test("prefers the provider's own non-cached count", () => {
    expect(
      toAgentTokenUsage({
        inputTokens: 100_000,
        inputTokenDetails: { noCacheTokens: 12_345, cacheReadTokens: 80_000 },
      }).inputTokens
    ).toBe(12_345);
  });

  test("reads the flattened shape eve emits", () => {
    expect(
      toAgentTokenUsage({
        inputTokens: 1000,
        outputTokens: 200,
        cacheReadTokens: 400,
      })
    ).toMatchObject({ inputTokens: 600, cacheReadTokens: 400 });
  });

  test("never reports negative input if the parts do not add up", () => {
    expect(
      toAgentTokenUsage({ inputTokens: 100, cacheReadTokens: 400 }).inputTokens
    ).toBe(0);
  });

  test("handles missing usage", () => {
    expect(toAgentTokenUsage(undefined)).toMatchObject({
      inputTokens: 0,
      totalTokens: 0,
    });
  });
});
