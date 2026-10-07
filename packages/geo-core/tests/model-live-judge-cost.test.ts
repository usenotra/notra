import { expect, mock, test } from "bun:test";

import type { RouteMetadata } from "@notra/ai/types/router";
import type { ProviderMetadata } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { Effect } from "effect";

import { GEO_JUDGE_MODEL } from "../src/constants/geo";
import { GeoModelService } from "../src/deps";
import {
  agentTokenUsageFrom,
  geoCheckWriteUsage,
} from "../src/utils/token-usage";

let providerMetadata: ProviderMetadata = {};
let route: RouteMetadata | undefined;
const model = new MockLanguageModelV4({
  doGenerate: async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          mentioned: true,
          position: 1,
          sentiment: "positive",
          competitors: [],
          excerpt: "Notra is recommended",
        }),
      },
    ],
    finishReason: { unified: "stop", raw: "stop" },
    usage: {
      inputTokens: {
        total: 1_000_000,
        noCache: 1_000_000,
        cacheRead: 0,
        cacheWrite: 0,
      },
      outputTokens: { total: 1_000_000, text: 1_000_000, reasoning: 0 },
    },
    warnings: [],
    providerMetadata,
  }),
});
const actualGateway = await import("@notra/ai/gateway");
const routedModel = mock(() => model);
mock.module("@notra/ai/gateway", () => ({
  ...actualGateway,
  gateway: routedModel,
  getRouteMetadata: () => route,
  // Network enrichment is the boundary; summarizeRouteUsage and token pricing
  // remain real, including reported-cost precedence and service-tier handling.
  enrichRouteMetadata: async (metadata: RouteMetadata) => metadata,
}));
const { geoModelLive } = await import("../src/geo/model-live");

async function judge() {
  return Effect.runPromise(
    GeoModelService.pipe(
      Effect.flatMap((service) =>
        service.judge({
          organizationId: "judge-cost-org",
          prompt: "Judge this answer",
          logContext: {
            projectId: "project",
            scanId: "scan",
            promptId: "prompt",
          },
        })
      ),
      Effect.provide(geoModelLive)
    )
  );
}

test("judge retains reported Flex pricing in usage and persisted check cost", async () => {
  providerMetadata = { gateway: { serviceTier: "flex" } };
  route = {
    gateway: "vercel",
    requestedModel: GEO_JUDGE_MODEL,
    model: GEO_JUDGE_MODEL,
    reason: "paid",
  };
  const result = await judge();
  expect(result.usage?.totalUsd).toBeCloseTo(0.725);
  expect(result.usage?.route).toEqual(route);
  expect(result.usage?.modelId).toBe(GEO_JUDGE_MODEL);
  expect(result.usage?.totalTokens).toBe(2_000_000);
  expect(result.mentioned).toBe(true);
  expect(agentTokenUsageFrom(result.usage).totalUsd).toBeCloseTo(0.725);
  expect(geoCheckWriteUsage(undefined, result.usage, 10).costUsd).toBeCloseTo(
    0.725
  );
  expect(routedModel).toHaveBeenLastCalledWith(GEO_JUDGE_MODEL, {
    organizationId: "judge-cost-org",
    logContext: { projectId: "project", scanId: "scan", promptId: "prompt" },
  });
});

test("judge prefers explicit route cost over a Flex token estimate", async () => {
  providerMetadata = { gateway: { serviceTier: "flex" } };
  route = {
    gateway: "vercel",
    requestedModel: GEO_JUDGE_MODEL,
    model: GEO_JUDGE_MODEL,
    reason: "paid",
    costUsd: 0.123,
  };
  const result = await judge();
  expect(result.usage?.totalUsd).toBe(0.123);
  expect(result.usage?.route?.costUsd).toBe(0.123);
  expect(agentTokenUsageFrom(result.usage).totalUsd).toBe(0.123);
});

test("judge keeps OpenRouter pricing even when provider metadata says Flex", async () => {
  providerMetadata = { gateway: { serviceTier: "flex" } };
  route = {
    gateway: "openrouter",
    requestedModel: GEO_JUDGE_MODEL,
    model: GEO_JUDGE_MODEL,
    reason: "paid",
  };
  const result = await judge();
  expect(result.usage?.totalUsd).toBeCloseTo(1.45);
  expect(result.usage?.route?.gateway).toBe("openrouter");
});
