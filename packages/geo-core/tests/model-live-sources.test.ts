import { expect, mock, test } from "bun:test";

import { MockLanguageModelV4 } from "ai/test";
import { Effect } from "effect";

import { GeoModelService } from "../src/deps";

const searchUrl = "https://example.com/search-result";
let retryAcrossGateways = false;
let retryCall = 0;
const model = new MockLanguageModelV4({
  doGenerate: async () => {
    if (retryAcrossGateways) {
      const first = retryCall++ === 0;
      return {
        content: [{ type: "text" as const, text: first ? "" : "Answer" }],
        finishReason: {
          unified: first ? ("length" as const) : ("stop" as const),
          raw: first ? "length" : "stop",
        },
        usage: {
          inputTokens: {
            total: 100_000,
            noCache: 100_000,
            cacheRead: 0,
            cacheWrite: 0,
          },
          outputTokens: {
            total: 100_000,
            text: first ? 0 : 100_000,
            reasoning: first ? 100_000 : 0,
          },
        },
        warnings: [],
        providerMetadata: {
          test: { gateway: first ? "openrouter" : "vercel" },
          google: {},
        },
      };
    }
    return {
      content: [
        { type: "text" as const, text: "Other tools are a better fit." },
      ],
      finishReason: { unified: "stop" as const, raw: "stop" },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 1, text: 1, reasoning: 0 },
      },
      warnings: [],
      providerMetadata: {
        test: {},
        google: {
          groundingMetadata: { groundingChunks: [{ web: { uri: searchUrl } }] },
        },
      },
    };
  },
});

// Bun keeps module mocks across test files, so keep the real exports other files import.
const actualGateway = await import("@notra/ai/gateway");
mock.module("@notra/ai/gateway", () => ({
  ...actualGateway,
  gateway: () => model,
  getRouteMetadata: (metadata: Record<string, Record<string, unknown>>) => {
    const gateway = metadata?.test?.gateway;
    return gateway === "vercel" || gateway === "openrouter"
      ? {
          gateway,
          requestedModel: "openai/gpt-5.6-sol",
          model: "openai/gpt-5.6-sol",
          reason: "paid" as const,
        }
      : undefined;
  },
}));

const { geoModelLive } = await import("../src/geo/model-live");

test("answer retries preserve each gateway's token cost", async () => {
  retryAcrossGateways = true;
  retryCall = 0;
  try {
    const answer = await Effect.runPromise(
      GeoModelService.pipe(
        Effect.flatMap((service) =>
          service.answer({
            organizationId: "test-org",
            engine: "openai/gpt-5.6-sol",
            prompt: "Which tools?",
            zdr: "preferred",
            gateway: undefined,
          })
        ),
        Effect.provide(geoModelLive)
      )
    );

    expect(retryCall).toBe(2);
    expect(answer.usage?.totalUsd).toBeCloseTo(3.6);
    expect(answer.usage?.route?.gateway).toBe("vercel");
  } finally {
    retryAcrossGateways = false;
  }
});
