import { expect, mock, test } from "bun:test";

import { MockLanguageModelV4 } from "ai/test";
import { Effect } from "effect";

import { GeoModelService } from "../src/deps";

const searchUrl = "https://example.com/search-result";
const citedUrl = "https://example.com/cited";
let cite = false;
const model = new MockLanguageModelV4({
  doGenerate: async () => ({
    content: [
      { type: "text" as const, text: "Other tools are a better fit." },
      ...(cite
        ? [
            {
              type: "source" as const,
              sourceType: "url" as const,
              id: "1",
              url: citedUrl,
            },
          ]
        : []),
    ],
    finishReason: { unified: "stop" as const, raw: "stop" },
    usage: {
      inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: 0 },
    },
    warnings: [],
    providerMetadata: {
      google: {
        groundingMetadata: { groundingChunks: [{ web: { uri: searchUrl } }] },
      },
    },
  }),
});

mock.module("@notra/ai/gateway", () => ({
  gateway: () => model,
  getRouteMetadata: () => undefined,
}));

const { geoModelLive } = await import("../src/geo/model-live");

test("live grounded mapping keeps search candidates separate from cited sources", async () => {
  for (const provider of ["gateway-google", "gateway-perplexity"] as const) {
    const engine = {
      key: `${provider}/test-grounded`,
      label: "Test",
      model: provider === "gateway-google" ? "google/test" : "perplexity/sonar",
      provider,
      zdr: "none" as const,
      envVar: null,
      isAvailable: () => true,
    };
    const answer = () =>
      Effect.runPromise(
        GeoModelService.pipe(
          Effect.flatMap((service) =>
            service.groundedAnswer({
              organizationId: "test-org",
              engine,
              messages: [{ role: "user", content: "Which tools?" }],
              zdr: "none",
            })
          ),
          Effect.provide(geoModelLive)
        )
      );

    cite = false;
    const searchOnly = await answer();
    expect(searchOnly.grounding.sources.map((source) => source.url)).toContain(
      searchUrl
    );
    expect(searchOnly.sources).toEqual([]);

    cite = true;
    const cited = await answer();
    expect(cited.sources).toEqual([{ url: citedUrl, title: null }]);
  }
});
