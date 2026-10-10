import { describe, expect, mock, test } from "bun:test";
import assert from "node:assert/strict";

import { Children, isValidElement } from "react";

import type { AnySuite, EvalRun } from "../src/types/eval";
import { ModelTable } from "../src/ui/screens/picker";
import { CasesTab } from "../src/ui/screens/results/cases";
import {
  collectEvidence,
  createPickerSettings,
  pickForSuite,
} from "../src/utils/picker";
import { formatUsd, summarizeRun, totalRunCost } from "../src/utils/stats";
import { COST_FIXTURES, COST_PRICE, COST_USAGE } from "./constants/cost";

// Isolate the test runner's disk writes and pricing reads; no network or paid calls.
mock.module("../src/store/runs", () => ({
  createRunId: () => "offline-cost-fixture",
  saveRun: async () => undefined,
}));
mock.module("../src/models/pricing", () => ({
  priceFor: async (modelId: string) =>
    modelId === "priced" ? COST_PRICE : undefined,
  allPrices: async () => ({ priced: COST_PRICE }),
}));
const { startRun } = await import("../src/runner/run-eval");
const { runCostDetails } = await import("../src/models/gateway");

function renderedText(element: unknown): string {
  if (typeof element === "string" || typeof element === "number") {
    return String(element);
  }
  if (!isValidElement<{ children?: unknown }>(element)) {
    return "";
  }
  return Children.toArray(
    element.props.children as Parameters<typeof Children.toArray>[0]
  )
    .map(renderedText)
    .join("");
}

describe("source → runner → persisted JSON → picker/stats → case text", () => {
  for (const fixture of COST_FIXTURES) {
    test(fixture.name, async () => {
      const contender = {
        key: "fixture",
        modelId: fixture.price ? "priced" : "unknown",
        kind: "llm" as const,
        label: "Fixture",
      };
      const usage = { ...COST_USAGE, cachedInputTokens: 0 };
      let calls = 0;
      const suite: AnySuite = {
        id: "cost-fixture",
        name: "Cost fixture",
        kind: "classification",
        stage: "offline",
        description: "Offline accounting regression",
        cases: [{ id: "case", title: "Fixture", input: {}, expected: "ok" }],
        defaultContenders: [contender.modelId],
        productionModel: contender.modelId,
        timeoutMs: 1000,
        run: async () => {
          calls += 1;
          return {
            ...(await runCostDetails(contender.modelId, usage, fixture.steps)),
            usage,
            output: "ok",
          };
        },
        score: () => ({ score: 1, pass: true, fields: [] }),
        demoOutput: () => "ok",
      };
      const handle = startRun({
        suite,
        config: {
          suiteId: suite.id,
          contenders: [contender],
          repeats: 1,
          concurrency: 1,
          demo: false,
        },
      });
      const result = await handle.done;
      const json = JSON.stringify(result);
      expect(json).not.toContain("NaN");
      expect(json).not.toContain('"costUsd":null');
      const saved = JSON.parse(json) as EvalRun;
      const task = saved.tasks[0];
      assert.ok(task);
      expect(task.costSource).toBe(fixture.source);
      expect(task.reportedCostUsd).toBe(fixture.reported);
      expect(task.estimatedCostUsd).toBeDefined();
      if (fixture.candidate === undefined) {
        expect(task.costUsd).toBeUndefined();
      } else {
        expect(task.costUsd).toBeCloseTo(fixture.candidate, 12);
      }
      const evidence = collectEvidence([saved], suite.id, false)[0];
      const summary = summarizeRun(saved)[0];
      assert.ok(evidence && summary);
      expect(evidence.costSource).toBe(fixture.source);
      expect(summary.costSource).toBe(fixture.source);
      const pick = pickForSuite({
        suite,
        runs: [saved],
        demo: false,
        settings: createPickerSettings(),
        prices: {},
      });
      if (fixture.source === "unknown") {
        expect(evidence.costKnown).toBe(false);
        expect(evidence.costPerCall).toBeUndefined();
        expect(summary.costUsd).toBeUndefined();
        expect(totalRunCost([summary])).toBeUndefined();
        expect(summary.knownCostUsd).toBe(fixture.reported);
        expect(pick.recommended).toBeUndefined();
        expect(pick.monthlyNow).toBeUndefined();
      } else {
        expect(evidence.costKnown).toBe(true);
        expect(pick.recommended?.modelId).toBe(contender.modelId);
        expect(summary.costUsd).toBeCloseTo(fixture.candidate ?? 0, 12);
        expect(totalRunCost([summary])).toBeCloseTo(fixture.candidate ?? 0, 12);
      }
      for (const width of [200, 100]) {
        const text = renderedText(
          CasesTab({
            run: saved,
            suite,
            caseIndex: 0,
            contenderIndex: 0,
            detailScroll: 0,
            height: 40,
            width,
          })
        );
        expect(text).toContain(
          `${formatUsd(task.costUsd)} (${fixture.source})`
        );
        if (fixture.source === "unknown") {
          expect(text).not.toContain("known subtotal: $0;");
          if (fixture.reported > 0) {
            expect(text).toContain(
              `known subtotal: ${formatUsd(fixture.reported)}`
            );
            expect(text).toContain("total unknown");
          } else {
            expect(text).not.toContain("known subtotal:");
            expect(text).not.toContain("$0");
          }
        }
      }
      // At this width the note column is only 10 cells; long reasons truncate.
      expect(renderedText(ModelTable({ pick, width: 96 }))).toContain(
        fixture.source
      );
      task.status = "error";
      task.error = "Scoring failed: offline fixture";
      const retried = await startRun({
        suite,
        config: saved.config,
        resume: saved,
      }).done;
      expect(calls).toBe(1);
      expect(retried.tasks[0]?.status).toBe("done");
      expect(retried.tasks[0]?.costSource).toBe(fixture.source);
      expect(retried.tasks[0]?.reportedCostUsd).toBe(fixture.reported);
    });
  }

  test("unknown judge spend invalidates displayed total without changing contender evidence", () => {
    const run: EvalRun = {
      id: "judge",
      config: {
        suiteId: "judge",
        contenders: [
          { key: "model", modelId: "model", kind: "llm", label: "Model" },
        ],
        repeats: 1,
        concurrency: 1,
        demo: false,
      },
      suiteName: "Judge",
      suiteKind: "generation",
      createdAt: "2026-10-10T00:00:00Z",
      status: "done",
      tasks: [
        {
          contenderKey: "model",
          caseId: "case",
          repeat: 0,
          status: "done",
          costUsd: 0.003,
          costSource: "reported",
          score: {
            score: 1,
            pass: true,
            fields: [],
            judgeCostSource: "unknown",
          },
        },
      ],
    };
    const summaries = summarizeRun(run);
    expect(summaries[0]?.judgeCostUsd).toBeUndefined();
    expect(summaries[0]?.judgeCostSource).toBe("unknown");
    expect(formatUsd(totalRunCost(summaries))).toBe("–");
    expect(collectEvidence([run], "judge", false)[0]?.costKnown).toBe(true);
  });

  test.each(["generation", "scoring"] as const)(
    "%s failure distinguishes an uncalled judge from unknown judge spend",
    async (stage) => {
      const contender = {
        key: "failure",
        modelId: "priced",
        kind: "llm" as const,
        label: "Failure",
      };
      const usage = { ...COST_USAGE, cachedInputTokens: 0 };
      let scoreCalls = 0;
      const suite: AnySuite = {
        id: "failure-fixture",
        name: "Failure fixture",
        kind: "generation",
        stage: "offline",
        description: "Offline failure accounting",
        cases: [{ id: "case", title: "Fixture", input: {}, expected: "ok" }],
        defaultContenders: [contender.modelId],
        productionModel: contender.modelId,
        timeoutMs: 1000,
        run: async () => {
          if (stage === "generation") {
            throw new Error("Generation failed before scoring");
          }
          return {
            ...(await runCostDetails(contender.modelId, usage, [
              { providerMetadata: { gateway: { cost: 0.003 } } },
            ])),
            usage,
            output: "ok",
          };
        },
        score: () => {
          scoreCalls += 1;
          throw new Error("Judge failed while scoring");
        },
        demoOutput: () => "ok",
      };
      const run = await startRun({
        suite,
        config: {
          suiteId: suite.id,
          contenders: [contender],
          repeats: 1,
          concurrency: 1,
          demo: false,
        },
      }).done;
      const task = run.tasks[0];
      const summary = summarizeRun(run)[0];
      assert.ok(task && summary);
      expect(task.status).toBe("error");
      expect(task.called).toBe(stage === "generation" ? undefined : true);
      expect(scoreCalls).toBe(stage === "generation" ? 0 : 1);
      expect(task.score).toBeUndefined();
      expect(summary.judgeCostUsd).toBe(stage === "generation" ? 0 : undefined);
      expect(summary.judgeCostSource).toBe(
        stage === "generation" ? undefined : "unknown"
      );
      // A failed generation is still an unknown model bill, not a free call.
      expect(summary.costUsd).toBe(stage === "generation" ? undefined : 0.003);
      expect(totalRunCost([summary])).toBeUndefined();
    }
  );
});
