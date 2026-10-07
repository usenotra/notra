import { expect, mock, test } from "bun:test";

import { MockLanguageModelV4 } from "ai/test";
import { Effect } from "effect";

import { GeoModelService } from "../src/deps";
import type { GeoGroundedProvider } from "../src/types/geo";

const model = new MockLanguageModelV4({
  doGenerate: async () => ({
    content: [{ type: "text", text: "Mock answer" }],
    finishReason: { unified: "stop", raw: "stop" },
    usage: {
      inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: 0 },
    },
    warnings: [],
  }),
});
mock.module("../src/geo/engines", () => ({
  buildGroundedInvocation: () => ({ model, tools: {} }),
}));
const { geoModelLive } = await import("../src/geo/model-live");

test.each(["openai/gpt-6-sol", "openai/gpt-6-astra", "openai/gpt-5.6-sol"])(
  "GEO requests Flex for %s through gateway and direct OpenAI",
  async (modelId) => {
    for (const provider of ["gateway-openai", "direct-openai"] as const) {
      const direct = provider === "direct-openai";
      await Effect.runPromise(
        GeoModelService.pipe(
          Effect.flatMap((service) =>
            service.groundedAnswer({
              organizationId: "org-test",
              zdr: "none",
              messages: [{ role: "user", content: "Which tools?" }],
              engine: {
                key: `${modelId}${direct ? "-direct" : ""}-grounded`,
                model: direct ? modelId.slice(7) : modelId,
                provider,
                label: modelId,
                zdr: "none",
                envVar: null,
                isAvailable: () => true,
              },
            })
          ),
          Effect.provide(geoModelLive)
        )
      );
      const options = model.doGenerateCalls.at(-1)?.providerOptions;
      expect(options?.[direct ? "openai" : "gateway"]?.serviceTier).toBe(
        "flex"
      );
      expect(
        options?.[direct ? "gateway" : "openai"]?.serviceTier
      ).toBeUndefined();
    }
  }
);

test.each([
  ["google/gemini-3.5-flash", "gateway-google"],
  ["anthropic/claude-opus-5.5", "gateway-anthropic"],
  ["openai/gpt-5.4-mini", "gateway-openai"],
] as const)(
  "GEO does not change tier or reasoning for %s",
  async (modelId, provider: GeoGroundedProvider) => {
    await Effect.runPromise(
      GeoModelService.pipe(
        Effect.flatMap((service) =>
          service.groundedAnswer({
            organizationId: "org-test",
            zdr: "none",
            messages: [{ role: "user", content: "Which tools?" }],
            engine: {
              key: `${modelId}-grounded`,
              model: modelId,
              provider,
              label: modelId,
              zdr: "none",
              envVar: null,
              isAvailable: () => true,
            },
          })
        ),
        Effect.provide(geoModelLive)
      )
    );
    const options = model.doGenerateCalls.at(-1)?.providerOptions;
    expect(options?.gateway?.serviceTier).toBeUndefined();
    expect(options?.google).toBeUndefined();
    expect(options?.openai).toBeUndefined();
  }
);
