import { describe, expect, mock, test } from "bun:test";

import { ROUTER_POLICY } from "../../constants/router";
import type { RouteMetadata } from "../../types/router";
import { createModelRouter } from "../create-router";
import { buildRouteMetadata } from "../lazy-model";
import { createOpenRouterAdapter } from "./openrouter";
import { createVercelAdapter } from "./vercel";

describe("gateway reported charge metadata", () => {
  const route: RouteMetadata = {
    gateway: "vercel",
    requestedModel: "anthropic/claude-sonnet-5.5",
    model: "anthropic/claude-sonnet-5.5",
    reason: "paid",
    generationId: "gen_test",
    zdrEnforced: true,
  };

  test.each([
    { isByok: false, totalCost: 0, upstreamCost: 0.75, expectedCost: 0 },
    {
      isByok: false,
      totalCost: 0.125,
      upstreamCost: 0.75,
      expectedCost: 0.125,
    },
    { isByok: true, totalCost: 0, upstreamCost: 0, expectedCost: 0 },
    { isByok: true, totalCost: 0.125, upstreamCost: 0.75, expectedCost: 0.875 },
    {
      isByok: true,
      totalCost: 0.000075,
      upstreamCost: 0.3382364,
      expectedCost: 0.3383114,
    },
    {
      isByok: true,
      totalCost: 0.125,
      upstreamCost: -1,
      expectedCost: undefined,
    },
    {
      isByok: true,
      totalCost: -1,
      upstreamCost: 0.75,
      expectedCost: undefined,
    },
    {
      isByok: true,
      totalCost: 0.125,
      upstreamCost: undefined,
      expectedCost: undefined,
    },
    {
      isByok: true,
      totalCost: 0.125,
      upstreamCost: Number.POSITIVE_INFINITY,
      expectedCost: undefined,
    },
    {
      isByok: true,
      totalCost: Number.NaN,
      upstreamCost: 0.75,
      expectedCost: undefined,
    },
  ])(
    "uses complete Vercel modeled spend or leaves estimation available: %j",
    async ({ isByok, totalCost, upstreamCost, expectedCost }) => {
      const fetchGeneration = mock(async () =>
        Response.json({
          data: {
            id: "gen_test",
            total_cost: totalCost,
            upstream_inference_cost: upstreamCost,
            usage: totalCost,
            created_at: "2026-10-05T00:00:00Z",
            model: "anthropic/claude-sonnet-5.5",
            is_byok: isByok,
            provider_name: "anthropic",
            streamed: false,
            finish_reason: "stop",
            latency: 20,
            generation_time: 50,
            native_tokens_prompt: 100,
            native_tokens_completion: 10,
            native_tokens_reasoning: 0,
            native_tokens_cached: 0,
            native_tokens_cache_creation: 0,
            billable_web_search_calls: 1,
          },
        })
      );
      const adapter = createVercelAdapter({
        apiKey: "test-gateway-key",
        fetch: fetchGeneration as unknown as typeof fetch,
      });
      const router = createModelRouter({
        adapters: { vercel: adapter },
        policy: ROUTER_POLICY,
        resolvePlan: async () => "paid",
      });
      const enriched = await router.enrichRouteMetadata(route);
      expect(enriched).toMatchObject(route);
      if (expectedCost === undefined) {
        expect(enriched).not.toHaveProperty("costUsd");
      } else {
        expect(enriched.upstreamProvider).toBe("anthropic");
        expect(enriched.costUsd).toBeCloseTo(expectedCost, 10);
      }
      expect(fetchGeneration).toHaveBeenCalledTimes(1);
    }
  );

  test("retains metadata for estimation when generation lookup fails", async () => {
    const fetchGeneration = mock(async () =>
      Response.json(
        { error: { message: "Usage event not found" } },
        { status: 404 }
      )
    );
    const adapter = createVercelAdapter({
      apiKey: "test-gateway-key",
      fetch: fetchGeneration as unknown as typeof fetch,
    });
    const router = createModelRouter({
      adapters: { vercel: adapter },
      policy: ROUTER_POLICY,
      resolvePlan: async () => "paid",
    });
    expect(await router.enrichRouteMetadata(route)).toEqual(route);
    expect(fetchGeneration).toHaveBeenCalledTimes(1);
  });

  test("aborts a stalled Vercel lookup and retains metadata for estimation", async () => {
    const fetchGeneration = mock(
      (_input: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error("Missing lookup abort signal"));
            return;
          }
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        })
    );
    const adapter = createVercelAdapter({
      apiKey: "test-gateway-key",
      fetch: fetchGeneration as unknown as typeof fetch,
    });
    const router = createModelRouter({
      adapters: { vercel: adapter },
      policy: ROUTER_POLICY,
      resolvePlan: async () => "paid",
    });
    expect(await router.enrichRouteMetadata(route)).toEqual(route);
    expect(fetchGeneration.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  test.each([0, 0.125])(
    "preserves OpenRouter's reported charge %s through route extraction",
    (cost) => {
      const adapter = createOpenRouterAdapter({ apiKey: "test-router-key" });
      expect(
        buildRouteMetadata(
          {
            gateway: "openrouter",
            requestedModelId: "anthropic/claude-sonnet-5.5",
            modelId: "anthropic/claude-sonnet-5.5",
            reason: "free",
            zdr: "required",
            zdrEnforced: true,
          },
          adapter,
          {
            openrouter: {
              provider: "anthropic",
              usage: { cost },
            },
          },
          "anthropic/claude-sonnet-5.5-20261005"
        )
      ).toEqual({
        gateway: "openrouter",
        requestedModel: "anthropic/claude-sonnet-5.5",
        model: "anthropic/claude-sonnet-5.5",
        reason: "free",
        upstreamProvider: "anthropic",
        costUsd: cost,
        zdrEnforced: true,
      });
    }
  );

  test.each([
    { cost: 0, upstreamCost: 0, expectedCost: 0 },
    { cost: 0.125, upstreamCost: 0.75, expectedCost: 0.875 },
    { cost: 0, upstreamCost: 0.75, expectedCost: 0.75 },
    { cost: 0.125, upstreamCost: undefined, expectedCost: undefined },
    { cost: 0.125, upstreamCost: -1, expectedCost: undefined },
    { cost: 0.125, upstreamCost: Number.NaN, expectedCost: undefined },
    { cost: undefined, upstreamCost: 0.75, expectedCost: undefined },
    { cost: -1, upstreamCost: 0.75, expectedCost: undefined },
  ])(
    "uses complete OpenRouter BYOK spend or leaves estimation available: %j",
    ({ cost, upstreamCost, expectedCost }) => {
      const adapter = createOpenRouterAdapter({ apiKey: "test-router-key" });
      const extracted = adapter.extractRouteMetadata({
        openrouter: {
          usage: { cost, costDetails: { upstreamInferenceCost: upstreamCost } },
        },
      });
      if (expectedCost === undefined) {
        expect(extracted).not.toHaveProperty("costUsd");
      } else {
        expect(extracted.costUsd).toBeCloseTo(expectedCost, 10);
      }
    }
  );

  test.each([-1, Number.NaN, Number.POSITIVE_INFINITY, "0.125", undefined])(
    "ignores unavailable or invalid OpenRouter charges: %s",
    (cost) => {
      const adapter = createOpenRouterAdapter({ apiKey: "test-router-key" });
      expect(
        adapter.extractRouteMetadata({ openrouter: { usage: { cost } } })
      ).not.toHaveProperty("costUsd");
    }
  );
});
