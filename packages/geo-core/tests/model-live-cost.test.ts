import { describe, expect, mock, test } from "bun:test";

import type { RouteMetadata } from "@notra/ai/types/router";
import { tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { Deferred, Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { z } from "zod";

import { GeoModelService } from "../src/deps";
import {
  addAgentTokenUsage,
  EMPTY_AGENT_TOKEN_USAGE,
  geoCheckWriteUsage,
} from "../src/utils/token-usage";

let calls = 0;
let multiStep = false;
let costUsd = 0.07;
let includeRoute = true;
let judgeMode = false;
let requestedModel = "";
let enrichRouteMetadata = async (metadata: RouteMetadata) => metadata;
const model = new MockLanguageModelV4({
  doGenerate: async () => {
    const first = calls++ === 0;
    const search = multiStep && first;
    return {
      content: search
        ? [
            {
              type: "tool-call" as const,
              toolCallId: "lookup-1",
              toolName: "lookup",
              input: "{}",
            },
          ]
        : [
            {
              type: "text" as const,
              text: judgeMode
                ? JSON.stringify({
                    mentioned: true,
                    position: 1,
                    sentiment: "positive",
                    competitors: [],
                    excerpt: "Notra",
                  })
                : "Notra is a content platform.",
            },
          ],
      finishReason: {
        unified: search ? ("tool-calls" as const) : ("stop" as const),
        raw: "stop",
      },
      usage: {
        inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 20, text: 20, reasoning: 0 },
      },
      warnings: [],
      providerMetadata: { test: { costUsd: first ? costUsd : 0.02 } },
    };
  },
});

const actualGateway = await import("@notra/ai/gateway");
mock.module("@notra/ai/gateway", () => ({
  ...actualGateway,
  gateway: (modelId: string) => {
    requestedModel = modelId;
    return model;
  },
  getRouteMetadata: (metadata: { test?: { costUsd?: number } }) =>
    includeRoute && metadata?.test
      ? {
          gateway: "vercel",
          requestedModel: "openai/gpt-6-sol",
          model: "openai/gpt-6-sol",
          reason: "paid",
          costUsd: metadata.test.costUsd,
        }
      : undefined,
  enrichRouteMetadata: (metadata: RouteMetadata) =>
    enrichRouteMetadata(metadata),
}));
mock.module("../src/geo/engines", () => ({
  buildGroundedInvocation: () => ({
    model,
    tools: {
      lookup: tool({
        inputSchema: z.object({}),
        execute: async () => "Public search result",
      }),
    },
  }),
}));

const { geoModelLive } = await import("../src/geo/model-live");

describe("GEO billed cost accounting", () => {
  test.each([
    {
      key: "openai/gpt-6-sol-grounded",
      provider: "gateway-openai" as const,
      model: "openai/gpt-6-sol",
    },
    {
      key: "openai/gpt-6-sol-direct-grounded",
      provider: "direct-openai" as const,
      model: "gpt-6-sol",
    },
  ])(
    "$key preserves billed costs and canonical model identity",
    async (engine) => {
      calls = 0;
      multiStep = false;
      costUsd = 0.07;
      const result = await Effect.runPromise(
        GeoModelService.pipe(
          Effect.flatMap((service) =>
            service.groundedAnswer({
              organizationId: "test-org",
              engine: {
                ...engine,
                label: "GPT-6 Sol",
                zdr: "all",
                envVar: null,
                isAvailable: () => true,
              },
              messages: [{ role: "user", content: "Which tools?" }],
              zdr: "none",
            })
          ),
          Effect.provide(geoModelLive)
        )
      );
      expect(result.usage?.modelId).toBe("openai/gpt-6-sol");
      expect(result.usage?.totalUsd).toBeCloseTo(0.07);
      expect(
        geoCheckWriteUsage(result.usage, undefined, 1).costUsd
      ).toBeCloseTo(0.07);
    }
  );

  test("grounded calls sum every generation charge rather than the last step", async () => {
    calls = 0;
    multiStep = true;
    costUsd = 0.07;
    try {
      const result = await Effect.runPromise(
        GeoModelService.pipe(
          Effect.flatMap((service) =>
            service.groundedAnswer({
              organizationId: "test-org",
              engine: {
                key: "openai/gpt-6-sol-grounded",
                provider: "gateway-openai",
                model: "openai/gpt-6-sol",
                label: "GPT-6 Sol",
                zdr: "all",
                envVar: null,
                isAvailable: () => true,
              },
              messages: [{ role: "user", content: "Which tools?" }],
              zdr: "none",
            })
          ),
          Effect.provide(geoModelLive)
        )
      );
      expect(calls).toBe(2);
      expect(result.usage?.totalUsd).toBeCloseTo(0.09);
      expect(result.usage?.inputTokens).toBe(200);
    } finally {
      multiStep = false;
    }
  });

  test("a provider-reported zero charge does not become an estimated charge", async () => {
    calls = 0;
    costUsd = 0;
    const result = await Effect.runPromise(
      GeoModelService.pipe(
        Effect.flatMap((service) =>
          service.answer({
            organizationId: "test-org",
            engine: "openai/gpt-6-sol",
            prompt: "Which tools?",
            zdr: "none",
            gateway: "vercel",
          })
        ),
        Effect.provide(geoModelLive)
      )
    );
    expect(result.usage?.totalUsd).toBe(0);
    expect(geoCheckWriteUsage(result.usage, undefined, 1).costUsd).toBe(0);
    const batch = addAgentTokenUsage(
      EMPTY_AGENT_TOKEN_USAGE,
      result.usage ?? {}
    );
    const scan = addAgentTokenUsage(EMPTY_AGENT_TOKEN_USAGE, batch);
    expect(scan.totalUsd).toBe(0);
    expect(scan.inputTokens).toBe(100);
  });

  test("direct calls without gateway metadata estimate the canonical model", async () => {
    calls = 0;
    includeRoute = false;
    try {
      const result = await Effect.runPromise(
        GeoModelService.pipe(
          Effect.flatMap((service) =>
            service.groundedAnswer({
              organizationId: "test-org",
              engine: {
                key: "openai/gpt-6-sol-direct-grounded",
                provider: "direct-openai",
                model: "gpt-6-sol",
                label: "GPT-6 Sol",
                zdr: "none",
                envVar: "OPENAI_API_KEY",
                isAvailable: () => true,
              },
              messages: [{ role: "user", content: "Which tools?" }],
              zdr: "none",
            })
          ),
          Effect.provide(geoModelLive)
        )
      );
      expect(result.usage?.modelId).toBe("openai/gpt-6-sol");
      expect(result.usage?.route).toBeUndefined();
      expect(result.usage?.totalUsd).toBeCloseTo(0.0004, 6);
    } finally {
      includeRoute = true;
    }
  });

  test("a pending cost lookup cannot turn a completed answer into an engine timeout", async () => {
    calls = 0;
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const lookupStarted = yield* Deferred.make<void>();
          const lookupFinished = yield* Deferred.make<RouteMetadata>();
          enrichRouteMetadata = async () => {
            await Effect.runPromise(Deferred.succeed(lookupStarted, undefined));
            return Effect.runPromise(Deferred.await(lookupFinished));
          };
          const service = yield* GeoModelService;
          const fiber = yield* service
            .answer({
              organizationId: "test-org",
              engine: "openai/gpt-6-sol",
              prompt: "Which tools?",
              zdr: "none",
              gateway: "vercel",
            })
            .pipe(Effect.forkChild);
          yield* Deferred.await(lookupStarted);
          yield* TestClock.adjust("181 seconds");
          yield* Deferred.succeed(lookupFinished, {
            gateway: "vercel",
            requestedModel: "openai/gpt-6-sol",
            model: "openai/gpt-6-sol",
            reason: "paid",
            costUsd: 0.07,
          });
          const result = yield* Fiber.join(fiber);
          expect(calls).toBe(1);
          expect(result.usage?.totalUsd).toBe(0.07);
        }).pipe(Effect.provide(geoModelLive), Effect.provide(TestClock.layer()))
      );
    } finally {
      enrichRouteMetadata = async (metadata) => metadata;
    }
  });

  test("uses Flex for the existing Nano judge without changing its schema or token budget", async () => {
    calls = 0;
    judgeMode = true;
    try {
      const result = await Effect.runPromise(
        GeoModelService.pipe(
          Effect.flatMap((service) =>
            service.judge({
              organizationId: "test-org",
              prompt: "Analyze Notra",
            })
          ),
          Effect.provide(geoModelLive)
        )
      );
      expect(requestedModel).toBe("openai/gpt-5.4-nano");
      expect(result.mentioned).toBe(true);
      expect(model.doGenerateCalls.at(-1)?.maxOutputTokens).toBe(800);
      expect(model.doGenerateCalls.at(-1)?.providerOptions?.gateway).toEqual({
        tags: ["geo-scan-judge"],
        serviceTier: "flex",
      });
    } finally {
      judgeMode = false;
    }
  });

  test.each([
    {
      modelId: "openai/gpt-5.6-sol",
      provider: "gateway-openai" as const,
      tier: "flex",
    },
    {
      modelId: "openai/gpt-6-sol",
      provider: "gateway-openai" as const,
      tier: undefined,
    },
    {
      modelId: "openai/gpt-5.6-luna",
      provider: "gateway-openai" as const,
      tier: "flex",
    },
    {
      modelId: "openai/gpt-5.6-terra",
      provider: "gateway-openai" as const,
      tier: "flex",
    },
    {
      modelId: "openai/gpt-5.6-sol",
      provider: "direct-openai" as const,
      tier: undefined,
    },
    {
      modelId: "anthropic/claude-sonnet-5.5",
      provider: "gateway-anthropic" as const,
      tier: undefined,
    },
    {
      modelId: "google/gemini-3.8-flash",
      provider: "gateway-google" as const,
      tier: undefined,
    },
  ])(
    "uses the fixed service tier for $modelId through $provider without configuration",
    async (scenario) => {
      calls = 0;
      await Effect.runPromise(
        GeoModelService.pipe(
          Effect.flatMap((service) =>
            service.groundedAnswer({
              organizationId: "test-org",
              engine: {
                key: `${scenario.modelId}${scenario.provider === "direct-openai" ? "-direct" : ""}-grounded`,
                provider: scenario.provider,
                model:
                  scenario.provider === "direct-openai"
                    ? "gpt-5.6-sol"
                    : scenario.modelId,
                label: "Test model",
                zdr: "all",
                envVar: null,
                isAvailable: () => true,
              },
              messages: [{ role: "user", content: "Which tools?" }],
              zdr: "required",
            })
          ),
          Effect.provide(geoModelLive)
        )
      );
      const request = model.doGenerateCalls.at(-1);
      expect(request?.providerOptions?.gateway?.serviceTier).toBe(
        scenario.tier
      );
      expect(request?.maxOutputTokens).toBe(4096);
      expect(request?.providerOptions?.gateway?.tags).toEqual([
        "geo-scan-grounded",
      ]);
    }
  );
});
