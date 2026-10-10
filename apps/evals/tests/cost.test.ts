import { describe, expect, test } from "bun:test";
import assert from "node:assert/strict";

import { runCostDetails } from "../src/models/gateway";
import type { ModelPrice } from "../src/models/pricing";
import type {
  EvalCostStep,
  EvalRun,
  TaskResult,
  TokenUsage,
} from "../src/types/eval";
import {
  estimateCost,
  readGatewayCost,
  summarizeCosts,
} from "../src/utils/cost";
import { collectEvidence, formatPerThousand } from "../src/utils/picker";
import { formatUsd, summarizeRun } from "../src/utils/stats";
import {
  COST_FIXTURES,
  COST_PRICE as price,
  COST_USAGE as usage,
} from "./constants/cost";

/** Original implementation, kept here to compare exactly the same fixtures. */
function baselineCost(steps: readonly EvalCostStep[], price?: ModelPrice) {
  let total = 0;
  for (const step of steps) {
    const gateway = (
      step.providerMetadata as { gateway?: Record<string, unknown> }
    )?.gateway;
    let cost: number | undefined;
    for (const key of ["cost", "marketCost"]) {
      const raw = gateway?.[key];
      const value = typeof raw === "string" ? Number(raw) : raw;
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        cost = value;
        break;
      }
    }
    if (cost === undefined) {
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
      };
      for (const item of steps) {
        usage.inputTokens += item.usage?.inputTokens ?? 0;
        usage.outputTokens += item.usage?.outputTokens ?? 0;
        usage.cachedInputTokens +=
          item.usage?.cachedInputTokens ??
          item.usage?.inputTokenDetails?.cacheReadTokens ??
          0;
      }
      return estimateCost(usage, price);
    }
    total += cost;
  }
  return total;
}

describe("eval cost accounting (offline, identical baseline/candidate fixtures)", () => {
  for (const fixture of COST_FIXTURES) {
    test(fixture.name, () => {
      const baseline = baselineCost(fixture.steps, fixture.price);
      const candidate = summarizeCosts(fixture.steps, fixture.price);
      if (fixture.baseline === undefined) {
        expect(baseline).toBeUndefined();
      } else {
        expect(baseline).toBeCloseTo(fixture.baseline, 12);
      }
      if (fixture.candidate === undefined) {
        expect(candidate.costUsd).toBeUndefined();
      } else {
        expect(candidate.costUsd).toBeCloseTo(fixture.candidate, 12);
      }
      expect(candidate.reportedCostUsd).toBe(fixture.reported);
      expect(candidate.costSource).toBe(fixture.source);
    });
  }

  test("rejects non-finite, negative and blank costs without substituting marketCost", () => {
    for (const cost of [
      undefined,
      null,
      "",
      " ",
      "NaN",
      "Infinity",
      Infinity,
      Number.NaN,
      -1,
      true,
    ]) {
      expect(
        readGatewayCost({ gateway: { cost, marketCost: 0.5 } })
      ).toBeUndefined();
    }
    expect(readGatewayCost(undefined)).toBeUndefined();
    expect(readGatewayCost(null)).toBeUndefined();
    expect(readGatewayCost({ gateway: { cost: "0.025" } })).toBe(0.025);
  });

  test("reported zero needs neither a price nor token usage", () => {
    expect(
      summarizeCosts([{ providerMetadata: { gateway: { cost: 0 } } }])
    ).toEqual({
      costUsd: 0,
      costSource: "reported",
      reportedCostUsd: 0,
      estimatedCostUsd: 0,
    });
  });

  test("runCostDetails keeps zero without gateway or price-list requests", async () => {
    const steps = [
      { providerMetadata: { gateway: { cost: "0", marketCost: "0.5" } } },
    ];
    const total = { ...usage, cachedInputTokens: 0 };
    const cost = await runCostDetails("unknown-model", total, steps);
    expect(cost.costUsd).toBe(0);
    expect(cost.costSource).toBe("reported");
  });

  test("cache estimate applies to only the missing step", () => {
    const result = summarizeCosts(
      [
        { usage, providerMetadata: { gateway: { cost: 0.003 } } },
        { usage: { ...usage, inputTokenDetails: { cacheReadTokens: 500 } } },
      ],
      price
    );
    expect(result.costUsd).toBeCloseTo(0.00375, 12);
    expect(result.reportedCostUsd).toBe(0.003);
    expect(result.estimatedCostUsd).toBeCloseTo(0.00075, 12);
    expect(result.costSource).toBe("mixed");
  });

  test("missing usage and empty steps are unknown, not free", () => {
    expect(summarizeCosts([], price).costSource).toBe("unknown");
    const result = summarizeCosts(
      [{ providerMetadata: { gateway: { cost: 0 } } }, {}],
      price
    );
    expect(result.costUsd).toBeUndefined();
    expect(result.costSource).toBe("unknown");
    expect(estimateCost({ inputTokens: 1000 }, price)).toBeUndefined();
  });
});

describe("unknown cost cannot win the picker or display as a complete subtotal", () => {
  const contender = {
    key: "model",
    modelId: "model",
    kind: "llm" as const,
    label: "Model",
  };

  function run(tasks: TaskResult[]): EvalRun {
    return {
      id: "fixture",
      config: {
        suiteId: "fixture",
        contenders: [contender],
        repeats: 1,
        concurrency: 1,
        demo: false,
      },
      suiteName: "Fixture",
      suiteKind: "classification",
      createdAt: "2026-10-10T00:00:00Z",
      status: "done",
      tasks,
    };
  }

  const done: TaskResult = {
    contenderKey: "model",
    caseId: "case-a",
    repeat: 0,
    status: "done",
    costUsd: 0.003,
    costSource: "reported",
    score: { score: 1, pass: true, fields: [] },
  };

  test("unknown attempted error spend invalidates per-call and total costs", () => {
    const fixture = run([
      done,
      {
        ...done,
        caseId: "case-b",
        status: "error",
        costUsd: undefined,
        costSource: "unknown",
      },
    ]);
    const evidence = collectEvidence([fixture], "fixture", false)[0];
    assert.ok(evidence);
    expect(evidence.costKnown).toBe(false);
    expect(evidence.costPerCall).toBeUndefined();
    const summary = summarizeRun(fixture)[0];
    assert.ok(summary);
    expect(summary.knownCostUsd).toBe(0.003);
    expect(summary.costSource).toBe("unknown");
    expect(formatUsd(summary.costUsd)).toBe("–");
    expect(formatPerThousand(evidence.costPerCall)).toBe("–");
  });

  test("finite reported zero remains a known, free call", () => {
    const fixture = run([{ ...done, costUsd: 0 }]);
    expect(collectEvidence([fixture], "fixture", false)[0]?.costKnown).toBe(
      true
    );
    const summary = summarizeRun(fixture)[0];
    assert.ok(summary);
    expect(summary.costUsd).toBe(0);
    expect(summary.costSource).toBe("reported");
    expect(formatUsd(summary.costUsd)).toBe("$0");
  });

  test("unknown partial cost preserves subtotal and mixed provenance aggregates", () => {
    const partial = summarizeCosts([
      { providerMetadata: { gateway: { cost: 0.007 } } },
      {},
    ]);
    const fixture = run([done, { ...done, ...partial, caseId: "case-b" }]);
    expect(summarizeRun(fixture)[0]?.knownCostUsd).toBe(0.01);
    expect(summarizeRun(fixture)[0]?.costSource).toBe("unknown");
    const mixed = run([
      done,
      { ...done, caseId: "case-b", costUsd: 0.001, costSource: "estimated" },
    ]);
    expect(summarizeRun(mixed)[0]?.costUsd).toBe(0.004);
    expect(summarizeRun(mixed)[0]?.costSource).toBe("mixed");
  });
});
