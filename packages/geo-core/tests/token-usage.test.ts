import { describe, expect, test } from "bun:test";
import assert from "node:assert/strict";

import { calculateAiCreditCostCents } from "@notra/ai/billing/ai-credit-cost";
import { geoBoxTokenUsage } from "@notra/ai/utils/geo-opencode-usage";

import { geoBoxAgentForEngine } from "../src/utils/geo-coding-agents";
import {
  addAgentTokenUsage,
  EMPTY_AGENT_TOKEN_USAGE,
} from "../src/utils/token-usage";

describe("GEO billing usage", () => {
  test("keeps Box costs through turn, batch, and project aggregation", () => {
    const opusTarget = geoBoxAgentForEngine("claude-code/claude-opus-5");
    const codexTarget = geoBoxAgentForEngine("codex/gpt-6-astra");
    assert.ok(opusTarget);
    assert.ok(codexTarget);
    const opus = geoBoxTokenUsage(
      {
        inputTokens: 1_000_000,
        outputTokens: 100_000,
        cachedInputTokens: 200_000,
        computeMs: 1200,
        totalUsd: 6.74,
      },
      opusTarget.model
    );
    const codex = geoBoxTokenUsage(
      {
        inputTokens: 500_000,
        outputTokens: 50_000,
        cachedInputTokens: 100_000,
        computeMs: 800,
        totalUsd: 1.25,
      },
      codexTarget.model
    );
    expect(opus.modelId).toBe("anthropic/claude-opus-5");
    expect(codex.modelId).toBe("openai/gpt-6-astra");
    const sequence = addAgentTokenUsage(
      addAgentTokenUsage(EMPTY_AGENT_TOKEN_USAGE, opus),
      codex
    );
    const batch = addAgentTokenUsage(EMPTY_AGENT_TOKEN_USAGE, sequence);
    const project = addAgentTokenUsage(
      EMPTY_AGENT_TOKEN_USAGE,
      structuredClone(batch)
    );
    expect(project.totalUsd).toBe(7.99);
    expect(project.inputTokens).toBe(1_200_000);
    expect(project.cacheReadTokens).toBe(300_000);
    expect(
      calculateAiCreditCostCents(project, "claude-code/claude-opus-5", false)
        .costCents
    ).toBe(799);
    expect(
      calculateAiCreditCostCents(project, "openai/gpt-5.4-mini", true).costCents
    ).toBe(879);
  });

  test("uses the mapped model when Box has no reported cost", () => {
    const opusTarget = geoBoxAgentForEngine("claude-code/claude-opus-5");
    assert.ok(opusTarget);
    const usage = geoBoxTokenUsage(
      {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cachedInputTokens: 200_000,
        computeMs: 1000,
        totalUsd: 0,
      },
      opusTarget.model
    );
    const total = addAgentTokenUsage(EMPTY_AGENT_TOKEN_USAGE, usage);
    expect(total.totalUsd).toBeCloseTo(29.1);
    expect(
      calculateAiCreditCostCents(total, "openai/gpt-5.4-mini", false).costCents
    ).toBe(2910);
  });

  test("includes token-priced calls alongside reported Box costs without rounding each call", () => {
    const box = geoBoxTokenUsage(
      {
        inputTokens: 100,
        outputTokens: 10,
        cachedInputTokens: 0,
        computeMs: 100,
        totalUsd: 0.005,
      },
      "anthropic/claude-opus-5"
    );
    const batch = addAgentTokenUsage(EMPTY_AGENT_TOKEN_USAGE, box);
    const mixed = addAgentTokenUsage(batch, {
      inputTokens: 1000,
      outputTokens: 0,
      totalTokens: 1000,
      modelId: "anthropic/claude-opus-5",
    });
    expect(mixed.totalUsd).toBe(0.01);
    expect(calculateAiCreditCostCents(mixed, undefined, false).costCents).toBe(
      1
    );
  });
});
