import { expect, mock, test } from "bun:test";

import { calculateAiCreditCostCents } from "@notra/ai/billing/ai-credit-cost";
import { MockLanguageModelV4 } from "ai/test";
import { Effect } from "effect";

import { GeoModelService } from "../src/deps";
import { agentTokenUsageFrom } from "../src/utils/token-usage";

let serviceTier = "flex";
const model = new MockLanguageModelV4({
  doGenerate: async () => ({
    content: [{ type: "text", text: "Mock grounded answer" }],
    finishReason: { unified: "stop", raw: "stop" },
    usage: {
      inputTokens: {
        total: 100_000,
        noCache: 100_000,
        cacheRead: 0,
        cacheWrite: 0,
      },
      outputTokens: { total: 0, text: 0, reasoning: 0 },
    },
    warnings: [],
    providerMetadata: { openai: { serviceTier } },
  }),
});
mock.module("../src/geo/engines", () => ({
  buildGroundedInvocation: () => ({ model, tools: {} }),
}));
const { geoModelLive } = await import("../src/geo/model-live");

test.each(["flex", "default"])(
  "GEO customer credits reflect returned %s even when Flex was requested",
  async (returnedTier) => {
    serviceTier = returnedTier;
    const answer = await Effect.runPromise(
      GeoModelService.pipe(
        Effect.flatMap((service) =>
          service.groundedAnswer({
            organizationId: "org-test",
            zdr: "none",
            messages: [{ role: "user", content: "Which tools?" }],
            engine: {
              key: "openai/gpt-6-sol-direct-grounded",
              model: "gpt-6-sol",
              provider: "direct-openai",
              label: "GPT-6 Sol",
              zdr: "none",
              envVar: null,
              isAvailable: () => true,
            },
          })
        ),
        Effect.provide(geoModelLive)
      )
    );
    expect(
      model.doGenerateCalls.at(-1)?.providerOptions?.openai?.serviceTier
    ).toBe("flex");
    expect(answer.usage.totalUsd).toBeCloseTo(
      returnedTier === "flex" ? 0.1 : 0.2,
      8
    );
    const credits = calculateAiCreditCostCents(
      agentTokenUsageFrom(answer.usage),
      "openai/gpt-6-sol",
      false
    );
    expect(credits.costCents).toBe(returnedTier === "flex" ? 10 : 20);
  }
);
