import { describe, expect, test } from "bun:test";

import { buildRouteMetadata } from "../lazy-model";
import { createOpenRouterAdapter } from "./openrouter";
import { createVercelAdapter } from "./vercel";

describe("Vercel cost metadata", () => {
  test.each([
    { byok: true, gateway: 0.02, upstream: 0.4, total: 0.02 + 0.4 },
    { byok: false, gateway: 0.42, upstream: 0.4, total: 0.42 },
    { byok: true, gateway: 0, upstream: 0, total: 0 },
    { byok: false, gateway: 0, upstream: 0, total: 0 },
  ])("preserves total and exposes components: %j", async (fixture) => {
    const adapter = createVercelAdapter({
      apiKey: "test-key",
      fetch: async () =>
        Response.json({
          data: {
            id: "gen_test",
            total_cost: fixture.gateway,
            upstream_inference_cost: fixture.upstream,
            usage: fixture.gateway,
            created_at: "2026-10-10T00:00:00Z",
            model: "openai/gpt-5.4-mini",
            is_byok: fixture.byok,
            provider_name: "openai",
            streamed: false,
            finish_reason: "stop",
            latency: 0,
            generation_time: 0,
            native_tokens_prompt: 1,
            native_tokens_completion: 1,
            native_tokens_reasoning: 0,
            native_tokens_cached: 0,
            native_tokens_cache_creation: 0,
            billable_web_search_calls: 0,
            market_cost: 99,
          },
        }),
    });

    expect(await adapter.lookupRouteMetadata?.("gen_test")).toEqual({
      model: "openai/gpt-5.4-mini",
      upstreamProvider: "openai",
      costUsd: fixture.total,
      gatewayCostUsd: fixture.gateway,
      upstreamInferenceCostUsd: fixture.byok ? fixture.upstream : 0,
      isByok: fixture.byok,
      costSource: "reported",
    });
  });

  test.each([
    { gateway: -1, upstream: 0.4 },
    { gateway: 0.02, upstream: -1 },
    { gateway: Number.MAX_VALUE, upstream: Number.MAX_VALUE },
  ])("does not report an invalid customer total: %j", async (fixture) => {
    const adapter = createVercelAdapter({
      apiKey: "test-key",
      fetch: async () =>
        Response.json({
          data: {
            id: "gen_test",
            total_cost: fixture.gateway,
            upstream_inference_cost: fixture.upstream,
            usage: fixture.gateway,
            created_at: "2026-10-10T00:00:00Z",
            model: "openai/gpt-5.4-mini",
            is_byok: true,
            provider_name: "openai",
            streamed: false,
            finish_reason: "stop",
            latency: 0,
            generation_time: 0,
            native_tokens_prompt: 1,
            native_tokens_completion: 1,
            native_tokens_reasoning: 0,
            native_tokens_cached: 0,
            native_tokens_cache_creation: 0,
            billable_web_search_calls: 0,
          },
        }),
    });
    const metadata = await adapter.lookupRouteMetadata?.("gen_test");
    expect(metadata?.costUsd).toBeUndefined();
    expect(metadata?.costSource).toBeUndefined();
    expect(metadata?.gatewayCostUsd).toBe(
      fixture.gateway >= 0 ? fixture.gateway : undefined
    );
    expect(metadata?.upstreamInferenceCostUsd).toBe(
      fixture.upstream >= 0 ? fixture.upstream : undefined
    );
  });
});

describe("OpenRouter cost metadata", () => {
  const adapter = createOpenRouterAdapter({ apiKey: "test-key" });

  test.each([
    { gateway: 0.02, upstream: 0.4 },
    { gateway: 0, upstream: 0 },
  ])("exposes reported components without guessing BYOK: %j", (fixture) => {
    const metadata = adapter.extractRouteMetadata({
      openrouter: {
        provider: "openai",
        usage: {
          cost: fixture.gateway,
          costDetails: { upstreamInferenceCost: fixture.upstream },
        },
      },
    });
    expect(metadata).toEqual({
      upstreamProvider: "openai",
      costUsd: fixture.gateway + fixture.upstream,
      gatewayCostUsd: fixture.gateway,
      upstreamInferenceCostUsd: fixture.upstream,
      costSource: "reported",
    });
    expect(metadata.isByok).toBeUndefined();
  });

  test("missing upstream details remain unknown, including for zero cost", () => {
    const metadata = adapter.extractRouteMetadata({
      openrouter: { usage: { cost: 0 } },
    });
    expect(metadata.costUsd).toBe(0);
    expect(metadata.gatewayCostUsd).toBe(0);
    expect(metadata.costSource).toBe("reported");
    expect(metadata.upstreamInferenceCostUsd).toBeUndefined();
    expect(metadata.isByok).toBeUndefined();
  });

  test.each([-1, Number.NaN, Number.POSITIVE_INFINITY, "0.02", null])(
    "rejects invalid gateway and upstream costs: %j",
    (invalid) => {
      const gateway = adapter.extractRouteMetadata({
        openrouter: { usage: { cost: invalid } },
      });
      expect(gateway.costUsd).toBeUndefined();
      expect(gateway.gatewayCostUsd).toBeUndefined();
      expect(gateway.costSource).toBeUndefined();
      const upstream = adapter.extractRouteMetadata({
        openrouter: {
          usage: {
            cost: 0.02,
            costDetails: { upstreamInferenceCost: invalid },
          },
        },
      });
      expect(upstream.costUsd).toBeUndefined();
      expect(upstream.upstreamInferenceCostUsd).toBeUndefined();
      expect(upstream.costSource).toBeUndefined();
      expect(upstream.gatewayCostUsd).toBe(0.02);
    }
  );

  test("rejects overflow and incomplete cost details", () => {
    for (const usage of [
      {
        cost: Number.MAX_VALUE,
        costDetails: { upstreamInferenceCost: Number.MAX_VALUE },
      },
      { cost: 0.02, costDetails: {} },
    ]) {
      const metadata = adapter.extractRouteMetadata({ openrouter: { usage } });
      expect(metadata.costUsd).toBeUndefined();
      expect(metadata.costSource).toBeUndefined();
    }
  });

  test("route annotation retains additive fields, including false and zero", () => {
    const metadata = buildRouteMetadata(
      {
        gateway: "openrouter",
        requestedModelId: "openai/gpt-5.4-mini",
        modelId: "openai/gpt-5.4-mini",
        reason: "free",
        zdr: "required",
        zdrEnforced: true,
      },
      {
        ...adapter,
        extractRouteMetadata: () => ({
          costUsd: 0,
          gatewayCostUsd: 0,
          upstreamInferenceCostUsd: 0,
          isByok: false,
          costSource: "reported",
        }),
      },
      undefined
    );
    expect(metadata).toEqual({
      gateway: "openrouter",
      requestedModel: "openai/gpt-5.4-mini",
      model: "openai/gpt-5.4-mini",
      reason: "free",
      zdrEnforced: true,
      costUsd: 0,
      gatewayCostUsd: 0,
      upstreamInferenceCostUsd: 0,
      isByok: false,
      costSource: "reported",
    });
  });
});
