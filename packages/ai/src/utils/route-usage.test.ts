import { beforeEach, describe, expect, mock, test } from "bun:test";

import { calculateTokenCostUsd } from "../billing/token-pricing";
import { ROUTER_METADATA_KEY } from "../constants/router";
import type { RouteMetadata } from "../types/router";
import { toAgentTokenUsage } from "./token-usage";

const enrichRouteMetadata = mock(async (metadata: RouteMetadata) => metadata);

mock.module("@notra/ai/gateway", () => ({
  enrichRouteMetadata,
  getRouteMetadata: (metadata: Record<string, unknown> | undefined) =>
    metadata?.[ROUTER_METADATA_KEY] as RouteMetadata | undefined,
}));

const { summarizeRouteUsage } = await import("./route-usage");

describe("summarizeRouteUsage reported charges", () => {
  const route: RouteMetadata = {
    gateway: "vercel",
    requestedModel: "anthropic/claude-sonnet-5.5",
    model: "anthropic/claude-sonnet-5.5",
    reason: "paid",
    generationId: "gen_test",
  };
  const usage = {
    inputTokens: 2000,
    outputTokens: 500,
    inputTokenDetails: { cacheReadTokens: 1000, cacheWriteTokens: 0 },
  };
  const estimate = calculateTokenCostUsd(
    toAgentTokenUsage(usage),
    route.model,
    route.gateway
  );

  beforeEach(() => {
    enrichRouteMetadata.mockReset();
    enrichRouteMetadata.mockImplementation(async (metadata) => metadata);
  });

  test("prefers the enriched billed cost without adding a token estimate", async () => {
    enrichRouteMetadata.mockImplementation(async (metadata) => ({
      ...metadata,
      costUsd: 0.125,
    }));
    expect(
      await summarizeRouteUsage([
        { providerMetadata: { [ROUTER_METADATA_KEY]: { ...route } }, usage },
      ])
    ).toEqual({
      route: { ...route, costUsd: 0.125 },
      maxPromptTokens: 2000,
      tokenCostUsd: 0.125,
    });
  });

  test("preserves a reported zero charge", async () => {
    const zero = { ...route, costUsd: 0 };
    expect(
      await summarizeRouteUsage([
        { providerMetadata: { [ROUTER_METADATA_KEY]: zero }, usage },
      ])
    ).toEqual({ route: zero, maxPromptTokens: 2000, tokenCostUsd: 0 });
  });

  test.each([undefined, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "estimates tokens when the reported charge is unavailable or invalid: %s",
    async (costUsd) => {
      const metadata = { ...route, costUsd };
      expect(
        (
          await summarizeRouteUsage([
            { providerMetadata: { [ROUTER_METADATA_KEY]: metadata }, usage },
          ])
        ).tokenCostUsd
      ).toBeCloseTo(estimate);
    }
  );

  test("sums mixed billed and estimated steps and retains the last route", async () => {
    const billed = { ...route, costUsd: 0.125 };
    expect(
      await summarizeRouteUsage([
        { providerMetadata: { [ROUTER_METADATA_KEY]: billed }, usage },
        { providerMetadata: { [ROUTER_METADATA_KEY]: { ...route } }, usage },
      ])
    ).toEqual({
      route,
      maxPromptTokens: 2000,
      tokenCostUsd: 0.125 + estimate,
    });
  });

  test("uses reported costs even when token counts are unavailable", async () => {
    const billed = { ...route, costUsd: 0.125 };
    expect(
      await summarizeRouteUsage([
        { providerMetadata: { [ROUTER_METADATA_KEY]: billed } },
      ])
    ).toEqual({ route: billed, maxPromptTokens: 0, tokenCostUsd: 0.125 });
  });

  test("retains token estimation without route metadata", async () => {
    expect(await summarizeRouteUsage([{ usage }], route.model)).toEqual({
      route: undefined,
      maxPromptTokens: 2000,
      tokenCostUsd: estimate,
    });
    expect(await summarizeRouteUsage([])).toEqual({});
  });
});
