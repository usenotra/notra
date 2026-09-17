import { describe, expect, test } from "bun:test";

import { summarizeRouteUsage } from "./route-usage";

describe("route usage summary", () => {
  test("reports the largest step prompt, not their sum", async () => {
    const summary = await summarizeRouteUsage([
      { usage: { inputTokens: 40_000 } },
      {
        usage: {
          inputTokens: 90_000,
          inputTokenDetails: { cacheReadTokens: 10_000 },
        },
      },
      { usage: { inputTokens: 60_000 } },
    ]);

    // The cached tokens are part of the reported 90k, not on top of it.
    expect(summary.maxPromptTokens).toBe(90_000);
  });

  test("prices each step once, cached tokens at the cached rate", async () => {
    const summary = await summarizeRouteUsage(
      [
        {
          usage: {
            inputTokens: 100_000,
            outputTokens: 1000,
            inputTokenDetails: { cacheReadTokens: 90_000 },
          },
        },
      ],
      "anthropic/claude-sonnet-5"
    );

    expect(summary.tokenCostUsd).toBeCloseTo(
      (10_000 * 2 + 90_000 * 0.2 + 1000 * 10) / 1_000_000
    );
  });

  test("omits the prompt size when steps carry no usage", async () => {
    const summary = await summarizeRouteUsage([{}]);
    expect(summary.maxPromptTokens).toBeUndefined();
  });

  test("has nothing to report without steps", async () => {
    expect(await summarizeRouteUsage(undefined)).toEqual({});
  });
});
