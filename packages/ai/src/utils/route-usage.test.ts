import { describe, expect, mock, test } from "bun:test";

import type { SharedV4ProviderMetadata } from "@ai-sdk/provider";
import { ROUTER_METADATA_KEY } from "@notra/ai/constants/router";
import type { RouteMetadata } from "@notra/ai/types/router";

// Isolate pricing tests from app initialization, credentials, and network lookups.
mock.module("@notra/ai/gateway", () => ({
  getRouteMetadata: (metadata: SharedV4ProviderMetadata | undefined) =>
    metadata?.[ROUTER_METADATA_KEY] as unknown as RouteMetadata | undefined,
  enrichRouteMetadata: async (metadata: RouteMetadata) => metadata,
}));

const { routeUsageProperties, summarizeRouteUsage } =
  await import("./route-usage");

describe("route cost provenance", () => {
  const reportedRoute = {
    gateway: "vercel",
    requestedModel: "openai/gpt-5.4-mini",
    model: "openai/gpt-5.4-mini",
    reason: "paid",
    upstreamProvider: "openai",
    costUsd: 0.02 + 0.4,
    gatewayCostUsd: 0.02,
    upstreamInferenceCostUsd: 0.4,
    isByok: true,
    costSource: "reported",
  } satisfies RouteMetadata;
  const estimatedRoute = {
    gateway: "vercel",
    requestedModel: "openai/gpt-5.6-sol",
    model: "openai/gpt-5.4-mini",
    reason: "paid",
  } satisfies RouteMetadata;
  const usage = { inputTokens: 100_000, outputTokens: 100_000 };

  test.each([false, true])(
    "keeps the pre-change $0.945 fixture total regardless of last step (reversed=%j)",
    async (reverse) => {
      const steps = [
        { providerMetadata: { [ROUTER_METADATA_KEY]: reportedRoute }, usage },
        { providerMetadata: { [ROUTER_METADATA_KEY]: estimatedRoute }, usage },
      ];
      if (reverse) {
        steps.reverse();
      }
      const summary = await summarizeRouteUsage(steps, "openai/gpt-5.6-sol");
      const before = reportedRoute.costUsd + 0.525;
      expect(summary.tokenCostUsd).toBe(before);
      expect(summary.tokenCostUsd).toBeCloseTo(0.945, 12);
      expect(summary.costSource).toBe("mixed");
      expect(summary.reportedCostUsd).toBe(reportedRoute.costUsd);
      expect(summary.estimatedCostUsd).toBe(0.525);
      expect(summary.reportedSteps).toBe(1);
      expect(summary.estimatedSteps).toBe(1);
      expect(summary.gatewayCostUsd).toBe(0.02);
      expect(summary.upstreamInferenceCostUsd).toBe(0.4);
      expect(summary.maxPromptTokens).toBe(100_000);
      expect(summary.route).toEqual(reverse ? reportedRoute : estimatedRoute);
      expect(routeUsageProperties(summary)).toMatchObject({
        cost_source: "mixed",
        reported_cost_usd: reportedRoute.costUsd,
        estimated_cost_usd: 0.525,
        reported_steps: 1,
        estimated_steps: 1,
        gateway_cost_usd: 0.02,
        upstream_inference_cost_usd: 0.4,
      });
    }
  );

  test("sums reported breakdowns across lookup batches", async () => {
    const summary = await summarizeRouteUsage(
      Array.from({ length: 5 }, () => ({
        providerMetadata: { [ROUTER_METADATA_KEY]: reportedRoute },
      }))
    );
    expect(summary.tokenCostUsd).toBeCloseTo(2.1, 12);
    expect(summary.reportedCostUsd).toBe(summary.tokenCostUsd);
    expect(summary.estimatedCostUsd).toBe(0);
    expect(summary.reportedSteps).toBe(5);
    expect(summary.estimatedSteps).toBe(0);
    expect(summary.gatewayCostUsd).toBeCloseTo(0.1, 12);
    expect(summary.upstreamInferenceCostUsd).toBe(2);
    expect(summary.costSource).toBe("reported");
  });

  test("reported zero is not replaced with a token estimate", async () => {
    const route = {
      ...reportedRoute,
      costUsd: 0,
      gatewayCostUsd: 0,
      upstreamInferenceCostUsd: 0,
      isByok: false,
    };
    const summary = await summarizeRouteUsage([
      { providerMetadata: { [ROUTER_METADATA_KEY]: route }, usage },
    ]);
    expect(summary.tokenCostUsd).toBe(0);
    expect(summary.reportedSteps).toBe(1);
    expect(summary.estimatedSteps).toBe(0);
    expect(summary.costSource).toBe("reported");
    expect(routeUsageProperties(summary)).toMatchObject({
      gateway_cost_usd: 0,
      upstream_inference_cost_usd: 0,
      is_byok: false,
      reported_cost_usd: 0,
    });
  });

  test.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "invalid reported costs use the unchanged estimate: %j",
    async (invalid) => {
      const summary = await summarizeRouteUsage([
        {
          providerMetadata: {
            [ROUTER_METADATA_KEY]: { ...reportedRoute, costUsd: invalid },
          },
          usage,
        },
      ]);
      expect(summary.tokenCostUsd).toBe(0.525);
      expect(summary.reportedCostUsd).toBe(0);
      expect(summary.estimatedCostUsd).toBe(0.525);
      expect(summary.costSource).toBe("estimated");
      expect(summary.gatewayCostUsd).toBeUndefined();
      expect(summary.upstreamInferenceCostUsd).toBeUndefined();
    }
  );

  test("legacy reported totals do not invent missing components", async () => {
    const summary = await summarizeRouteUsage([
      {
        providerMetadata: {
          [ROUTER_METADATA_KEY]: { ...estimatedRoute, costUsd: 0.42 },
        },
      },
    ]);
    expect(summary.tokenCostUsd).toBe(0.42);
    expect(summary.costSource).toBe("reported");
    expect(summary.gatewayCostUsd).toBeUndefined();
    expect(summary.upstreamInferenceCostUsd).toBeUndefined();
  });

  test("component subtotals stay partial when another reported step lacks a breakdown", async () => {
    const summary = await summarizeRouteUsage([
      { providerMetadata: { [ROUTER_METADATA_KEY]: reportedRoute } },
      {
        providerMetadata: {
          [ROUTER_METADATA_KEY]: { ...estimatedRoute, costUsd: 0.42 },
        },
      },
    ]);
    expect(summary.reportedCostUsd).toBeCloseTo(0.84, 12);
    expect(summary.tokenCostUsd).toBe(summary.reportedCostUsd);
    expect(summary.costSource).toBe("reported");
    expect(summary.reportedSteps).toBe(2);
    expect(summary.gatewayCostUsd).toBe(0.02);
    expect(summary.upstreamInferenceCostUsd).toBe(0.4);
  });

  test("invalid components are excluded without changing a valid total", async () => {
    const summary = await summarizeRouteUsage([
      {
        providerMetadata: {
          [ROUTER_METADATA_KEY]: {
            ...reportedRoute,
            gatewayCostUsd: -1,
            upstreamInferenceCostUsd: Number.POSITIVE_INFINITY,
          },
        },
      },
    ]);
    expect(summary.tokenCostUsd).toBe(reportedRoute.costUsd);
    expect(summary.gatewayCostUsd).toBeUndefined();
    expect(summary.upstreamInferenceCostUsd).toBeUndefined();
  });

  test("direct estimates and estimated zero retain provenance without a route", async () => {
    const summary = await summarizeRouteUsage([{ usage }], reportedRoute.model);
    expect(summary.tokenCostUsd).toBe(0.525);
    expect(summary.costSource).toBe("estimated");
    expect(routeUsageProperties(summary)).toMatchObject({
      cost_source: "estimated",
      estimated_cost_usd: 0.525,
    });
    const zero = await summarizeRouteUsage(
      [{ usage: {} }],
      reportedRoute.model
    );
    expect(zero.tokenCostUsd).toBe(0);
    expect(zero.estimatedSteps).toBe(1);
    expect(zero.costSource).toBe("estimated");
  });

  test("empty and unpriced usage do not claim reported or estimated cost", async () => {
    expect(await summarizeRouteUsage([])).toEqual({});
    expect(await summarizeRouteUsage(undefined)).toEqual({});
    const unpriced = await summarizeRouteUsage([
      { providerMetadata: { [ROUTER_METADATA_KEY]: estimatedRoute } },
    ]);
    expect(unpriced).toEqual({ route: estimatedRoute });
    expect(routeUsageProperties(undefined)).toEqual({});
    expect(routeUsageProperties({})).toEqual({});
  });
});
