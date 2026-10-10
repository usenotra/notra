import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { ROUTER_METADATA_KEY } from "@notra/ai/constants/router";

import { summarizeRouteUsage } from "../utils/route-usage";

describe("route usage", () => {
  test("prices the model served by the gateway instead of the requested model", async () => {
    const summary = await summarizeRouteUsage(
      [
        {
          providerMetadata: {
            [ROUTER_METADATA_KEY]: {
              gateway: "vercel",
              requestedModel: "openai/gpt-5.6-sol",
              model: "openai/gpt-5.4-mini",
              reason: "paid",
            },
          },
          usage: { inputTokens: 100_000, outputTokens: 100_000 },
        },
      ],
      "openai/gpt-5.6-sol"
    );
    assert.equal(summary.route?.model, "openai/gpt-5.4-mini");
    assert.equal(summary.tokenCostUsd, 0.525);
  });
});
