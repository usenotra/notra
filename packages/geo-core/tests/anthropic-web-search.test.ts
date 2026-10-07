import { describe, expect, test } from "bun:test";

import { GEO_GROUNDED_MAX_SEARCHES } from "../src/constants/geo";
import { buildGroundedInvocation } from "../src/geo/engines";
import type { GeoGroundedEngine } from "../src/types/geo";
import { geoAnthropicWebSearch } from "../src/utils/geo-anthropic-web-search";

describe("Anthropic GEO web search", () => {
  test.each(["required", "preferred", undefined, "none"] as const)(
    "direct Anthropic filtering also respects ZDR mode %s",
    (zdr) => {
      const previous = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = "mock-key";
      try {
        const engine: GeoGroundedEngine = {
          key: "anthropic/claude-opus-5.5-direct-grounded",
          model: "claude-opus-5-5",
          label: "Claude Opus 5.5",
          provider: "direct-anthropic",
          zdr: "none",
          envVar: "ANTHROPIC_API_KEY",
          isAvailable: () => true,
        };
        expect(
          buildGroundedInvocation(engine, { zdr }).tools.web_search
        ).toHaveProperty(
          "id",
          zdr === "none"
            ? "anthropic.web_search_20260318"
            : "anthropic.web_search_20250305"
        );
      } finally {
        if (previous === undefined) {
          delete process.env.ANTHROPIC_API_KEY;
        } else {
          process.env.ANTHROPIC_API_KEY = previous;
        }
      }
    }
  );
  test.each([
    "anthropic/claude-opus-5.5",
    "anthropic/claude-sonnet-5",
    "anthropic/claude-fable-5.1",
    "anthropic/claude-opus-4.6",
    "claude-sonnet-4-6",
  ])("enables dynamic filtering for %s", (modelId) => {
    const tool = geoAnthropicWebSearch(modelId, true);
    expect(tool.id).toBe("anthropic.web_search_20260318");
    expect(tool.args).toEqual({
      maxUses: GEO_GROUNDED_MAX_SEARCHES,
      responseInclusion: "excluded",
    });
  });

  test.each([
    "anthropic/claude-haiku-4.5",
    "anthropic/claude-opus-4.5",
    "claude-sonnet-4-0",
    "claude-3-7-sonnet-latest",
    "unknown-model",
  ])("retains basic search for unsupported %s", (modelId) => {
    const tool = geoAnthropicWebSearch(modelId, true);
    expect(tool.id).toBe("anthropic.web_search_20250305");
    expect(tool.args).toEqual({ maxUses: GEO_GROUNDED_MAX_SEARCHES });
  });

  test("the gateway invocation retains the selected model and filtering tool", () => {
    const engine: GeoGroundedEngine = {
      key: "anthropic/claude-opus-5.5-grounded",
      model: "anthropic/claude-opus-5.5",
      label: "Claude Opus 5.5",
      provider: "gateway-anthropic",
      zdr: "some",
      envVar: null,
      isAvailable: () => true,
    };
    const invocation = buildGroundedInvocation(engine, {
      organizationId: "test-org",
      zdr: "none",
    });
    expect(invocation.model).toHaveProperty("modelId", engine.model);
    expect(invocation.tools.web_search).toHaveProperty(
      "id",
      "anthropic.web_search_20260318"
    );
  });

  test.each(["required", "preferred", undefined] as const)(
    "keeps ZDR-compatible basic search when ZDR is %s",
    (zdr) => {
      const engine: GeoGroundedEngine = {
        key: "anthropic/claude-opus-5.5-grounded",
        model: "anthropic/claude-opus-5.5",
        label: "Claude Opus 5.5",
        provider: "gateway-anthropic",
        zdr: "some",
        envVar: null,
        isAvailable: () => true,
      };
      expect(
        buildGroundedInvocation(engine, { zdr }).tools.web_search
      ).toHaveProperty("id", "anthropic.web_search_20250305");
    }
  );
});
