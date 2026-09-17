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

    expect(summary.maxPromptTokens).toBe(100_000);
  });

  test("omits the prompt size when steps carry no usage", async () => {
    const summary = await summarizeRouteUsage([{}]);
    expect(summary.maxPromptTokens).toBeUndefined();
  });

  test("has nothing to report without steps", async () => {
    expect(await summarizeRouteUsage(undefined)).toEqual({});
  });
});
