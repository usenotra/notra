import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";

import { IRIS_CAPABILITY_CATALOG } from "@notra/ai/constants/autonomy-capabilities";
import type { AutonomyActionStatus } from "@notra/ai/types/autonomy";
import { Effect } from "effect";

import { buildIrisActionIdempotencyKey } from "@/utils/iris-hash";

import {
  artifact,
  baseline,
  controllerPath,
  mandate,
  plannerResult,
  stepsPath,
  taskInput,
} from "../../tests/constants/iris-retry-boundaries";

const dashboard = new URL("../../", import.meta.url).pathname;
const workflowPackage = realpathSync(`${dashboard}node_modules/workflow`);
const requireWorkflow = createRequire(`${workflowPackage}/package.json`);
const swc = await import(requireWorkflow.resolve("@swc/core"));
const compiler = requireWorkflow.resolve("@workflow/swc-plugin");
// Normal CI needs neither Git nor historical objects. Opt in from the dashboard:
// NOTRA_IRIS_RETRY_BENCHMARK=1 bun test src/workflows/iris-retry-boundaries.test.ts
const benchmark = process.env.NOTRA_IRIS_RETRY_BENCHMARK === "1";

function source(path: string, revision?: string): string {
  if (revision && !benchmark) {
    throw new Error("Historical source requires NOTRA_IRIS_RETRY_BENCHMARK=1");
  }
  return revision
    ? execFileSync("git", ["show", `${revision}:${path}`], {
        cwd: dashboard,
        encoding: "utf8",
      })
    : readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");
}

function compile(code: string, filename: string, mode: string): string {
  return swc.transformSync(code, {
    filename,
    jsc: {
      parser: { syntax: "typescript" },
      target: "es2022",
      experimental: { plugins: [[compiler, { mode }]] },
    },
    module: { type: "es6" },
  }).code;
}

async function fixture(revision?: string) {
  const counts = { planner: 0, persistence: 0, execution: 0 };
  const writes: unknown[] = [];
  const finalizations: unknown[] = [];
  const actionKeys: string[] = [];
  const taskWrites: unknown[] = [];
  const boundaries: string[] = [];
  const state = {
    persistenceFailures: 0,
    terminalWriteFailures: 0,
    checkpointFailures: 0,
    status: "executing" as AutonomyActionStatus,
    alreadyExisted: true,
    error: undefined as unknown,
    executionFails: false,
    plannerFails: false,
    plannerThrows: false,
    violations: [] as string[],
  };
  const registry = new Map<string, (input: unknown) => Promise<unknown>>();
  const context = createContext({
    structuredClone,
    Symbol,
    console: { log() {}, warn() {}, error() {} },
    __private_workflows: new Map(),
  });
  // Execute the compiler's actual WORKFLOW_USE_STEP proxies. Retry only the
  // registered step, never nested calls; match installed Workflow's 3 retries.
  Reflect.set(context, Symbol.for("WORKFLOW_USE_STEP"), (id: string) => {
    const proxy = async (input: unknown) => {
      boundaries.push(id.split("//").at(-1) ?? id);
      const handler = registry.get(id);
      if (!handler) {
        throw new Error(`Unregistered fixture step: ${id}`);
      }
      const maxRetries = Reflect.get(handler, "maxRetries") ?? 3;
      for (let attempt = 0; ; attempt++) {
        try {
          return structuredClone(await handler(structuredClone(input)));
        } catch (error) {
          if (attempt >= maxRetries) {
            throw error;
          }
        }
      }
    };
    return proxy;
  });
  const dependencies: Record<string, Record<string, unknown>> = {
    "workflow/internal/private": {
      registerStepFunction: (
        id: string,
        handler: (input: unknown) => Promise<unknown>
      ) => registry.set(id, handler),
    },
    "@/workflows/runtime": {},
    effect: { Effect },
    "@notra/ai/constants/autonomy-capabilities": { IRIS_CAPABILITY_CATALOG },
    "@notra/ai/autonomy/planner": {
      invokeIrisPlanner: (input: unknown) => {
        expect(input).toEqual({
          mandate,
          signalSummaries: [],
          recentActionSummaries: [],
          capabilityCatalog: IRIS_CAPABILITY_CATALOG,
        });
        counts.planner++;
        if (state.plannerThrows) {
          throw new Error("fixture planner transport failure");
        }
        return state.plannerFails
          ? Effect.fail({
              message: "fixture planner failed",
              violations: [],
              costCents: 9,
            })
          : Effect.succeed(structuredClone(plannerResult));
      },
    },
    "@notra/ai/autonomy/validate-plan": {
      validatePlannerOutputAgainstMandate: () => state.violations,
    },
    "@notra/ai/autonomy/capabilities": {
      executeIrisTask: () => {
        counts.execution++;
        return state.executionFails
          ? Effect.fail(new Error("fixture execution failed"))
          : Effect.succeed({ artifacts: [artifact], costCents: 23 });
      },
    },
    "@notra/ai/autonomy/run-store": {
      recordPlannerOutput: (input: unknown) => {
        counts.persistence++;
        writes.push(structuredClone(input));
        return counts.persistence <= state.persistenceFailures
          ? Effect.fail(new Error("fixture persistence failure"))
          : Effect.void;
      },
      startAction: ({ idempotencyKey }: { idempotencyKey: string }) => {
        actionKeys.push(idempotencyKey);
        const alreadyExisted = state.alreadyExisted;
        state.alreadyExisted = true;
        return Effect.succeed({
          alreadyExisted,
          action: {
            id: "action-fixture",
            status: state.status,
            error: state.error,
            externalRef: { artifacts: [artifact] },
          },
        });
      },
      finishAction: ({
        status,
        error,
      }: Parameters<
        typeof import("@notra/ai/autonomy/run-store").finishAction
      >[0]) => {
        state.status = status;
        state.error = error;
        return Effect.void;
      },
      markTask: (
        input: Parameters<
          typeof import("@notra/ai/autonomy/run-store").markTask
        >[0]
      ) => {
        const { status } = input;
        if (status !== "running" && state.terminalWriteFailures-- > 0) {
          return Effect.fail(new Error("fixture task write failure"));
        }
        taskWrites.push(input);
        return Effect.void;
      },
      appendCheckpoint: () =>
        state.checkpointFailures-- > 0
          ? Effect.fail(new Error("fixture checkpoint failure"))
          : Effect.void,
    },
    "@/utils/iris-hash": { buildIrisActionIdempotencyKey },
    "@/utils/iris-artifacts": {
      extractIrisArtifacts: () => [artifact],
    },
    "@/utils/iris-error": {
      describeIrisError: () => "fixture execution failed",
    },
  };
  function module(code: string, identifier: string) {
    const imports = new Map<string, string[]>();
    for (const item of swc.parseSync(code, { syntax: "ecmascript" }).body) {
      if (item.type === "ImportDeclaration") {
        imports.set(
          item.source.value,
          item.specifiers.map(
            (specifier: {
              imported?: { value: string };
              local: { value: string };
            }) => specifier.imported?.value ?? specifier.local.value
          )
        );
      }
    }
    const result = new SourceTextModule(code, { context, identifier });
    return { result, imports };
  }
  const stepCode = source(stepsPath, revision);
  const implementations = module(
    compile(stepCode, "src/workflows/steps/iris-steps.ts", "step"),
    "implementations"
  );
  const proxies = module(
    compile(stepCode, "src/workflows/steps/iris-steps.ts", "workflow"),
    "proxies"
  );
  const controller = module(
    compile(
      source(controllerPath, revision),
      "src/workflows/iris-controller.ts",
      "workflow"
    ),
    "controller"
  );
  async function link(entry: ReturnType<typeof module>) {
    await entry.result.link((specifier) => {
      if (specifier === "./steps/iris-steps") {
        return proxies.result;
      }
      const names = entry.imports.get(specifier) ?? [];
      return new SyntheticModule(
        names,
        function initialize() {
          for (const name of names) {
            this.setExport(
              name,
              dependencies[specifier]?.[name] ??
                (() => {
                  throw new Error(
                    `Unexpected fixture dependency: ${specifier}.${name}`
                  );
                })
            );
          }
        },
        { context }
      );
    });
    await entry.result.evaluate();
  }
  await link(implementations);
  await link(proxies);

  // Admission/control steps are fixtures; planning and persistence remain the
  // real registered implementations invoked through the compiled controller.
  const control = {
    claimIrisExecution: { claimed: true },
    acquireIrisLease: { acquired: true, fencingToken: 1 },
    loadIrisMandate: { mandate },
    resolveIrisFlagForRun: "enabled",
    gatherIrisContext: {
      pendingSignalCount: 1,
      pendingSignalIds: [],
      recentActionSummaries: [],
    },
    evaluateIrisGate: { proceed: true, reason: "fixture" },
    createIrisRun: { runId: "run-fixture" },
    coalesceIrisSignals: { signalIds: [], summaries: [] },
    finalizeIrisRun: undefined,
    markIrisSignalsProcessed: undefined,
    releaseIrisLease: undefined,
    closeOpenIrisRun: undefined,
    restoreIrisSignals: undefined,
  };
  for (const [name, value] of Object.entries(control)) {
    registry.set(
      `step//./src/workflows/steps/iris-steps//${name}`,
      async () => value
    );
  }
  registry.set(
    "step//./src/workflows/steps/iris-steps//finalizeIrisRun",
    async (input) => {
      finalizations.push(input);
    }
  );
  dependencies["@notra/schemas/dashboard/workflows/iris"] = {
    irisWorkflowPayloadSchema: {
      safeParse: (data: unknown) => ({ success: true, data }),
    },
  };
  await link(controller);
  return {
    counts,
    writes,
    finalizations,
    actionKeys,
    taskWrites,
    boundaries,
    state,
    steps: proxies.result.namespace as typeof import("./steps/iris-steps"),
    run: () =>
      (
        controller.result.namespace as typeof import("./iris-controller")
      ).irisControllerRun({
        organizationId: mandate.organizationId,
        executionId: "execution-fixture",
        trigger: "signal",
      }),
  };
}

test("compiled planner/persistence boundaries call the candidate planner once", async () => {
  const results = [];
  for (const revision of benchmark ? [baseline, undefined] : [undefined]) {
    const run = await fixture(revision);
    run.state.persistenceFailures = 3;
    expect(await run.run()).toEqual({
      status: "no_op",
      runId: "run-fixture",
      reason: "fixture",
    });
    expect(run.counts.persistence).toBe(4);
    expect(run.counts.planner).toBe(revision ? 4 : 1);
    expect(run.writes).toEqual(
      Array.from({ length: 4 }, () => ({
        runId: "run-fixture",
        plannerOutput: plannerResult.output,
        plannerInputHash: plannerResult.inputHash,
        costCents: plannerResult.costCents,
      }))
    );
    if (!revision) {
      expect(
        run.boundaries.filter((name) => name === "persistIrisPlannerOutput")
      ).toHaveLength(1);
    }
    results.push({ revision: revision ?? "candidate", ...run.counts });
  }
  if (benchmark) {
    console.log(
      JSON.stringify({
        fixture: "iris-planner-three-persistence-failures",
        results,
      })
    );
  }
});

test("planner rejection keeps cost and output; persistence still has its own boundary", async () => {
  const run = await fixture();
  run.state.violations = ["fixture policy rejection"];
  run.state.persistenceFailures = 1;
  expect((await run.run()).status).toBe("plan_rejected");
  expect(run.counts).toEqual({ planner: 1, persistence: 2, execution: 0 });
  expect(run.writes[1]).toEqual({
    runId: "run-fixture",
    plannerOutput: plannerResult.output,
    plannerInputHash: plannerResult.inputHash,
    costCents: 17,
  });
});

test("failed planner is not retried and does not persist a fabricated output", async () => {
  const run = await fixture();
  run.state.plannerFails = true;
  expect((await run.run()).status).toBe("plan_rejected");
  expect(run.counts).toEqual({ planner: 1, persistence: 0, execution: 0 });
  expect(run.finalizations).toEqual([
    expect.objectContaining({ costCents: 9 }),
  ]);
  expect(Reflect.get(run.steps.planIrisRun, "maxRetries")).toBe(0);
});

test("exhausted persistence retries cannot replay paid planning", async () => {
  const run = await fixture();
  run.state.persistenceFailures = 4;
  await expect(run.run()).rejects.toThrow("fixture persistence failure");
  expect(run.counts).toEqual({ planner: 1, persistence: 4, execution: 0 });
});

test("an ambiguous planner exception has zero generation retries", async () => {
  const run = await fixture();
  run.state.plannerThrows = true;
  await expect(run.run()).rejects.toThrow("fixture planner transport failure");
  expect(run.counts).toEqual({ planner: 1, persistence: 0, execution: 0 });
});

test.each(["unknown", "failed", "executing"] as const)(
  "existing %s action cannot execute after task/checkpoint write failures",
  async (status) => {
    const run = await fixture();
    run.state.status = status;
    run.state.terminalWriteFailures = 1;
    run.state.checkpointFailures = 1;
    expect((await run.steps.runIrisTask(taskInput)).status).toBe("failed");
    expect(run.counts.execution).toBe(0);
    expect(run.actionKeys).toEqual(
      new Array(3).fill(
        buildIrisActionIdempotencyKey(taskInput.runId, taskInput.task.localId)
      )
    );
    expect(run.state.status).toBe(status === "executing" ? "unknown" : status);
  }
);

test.each(["executing", "unknown", "failed"] as const)(
  "candidate action replay for %s never re-executes",
  async (status) => {
    const results = [];
    for (const revision of benchmark ? [baseline, undefined] : [undefined]) {
      const run = await fixture(revision);
      run.state.status = status;
      run.state.terminalWriteFailures = 1;
      run.state.checkpointFailures = 1;
      await run.steps.runIrisTask(taskInput);
      expect(run.counts.execution).toBe(revision ? 1 : 0);
      expect(new Set(run.actionKeys).size).toBe(1);
      results.push({
        revision: revision ?? "candidate",
        execution: run.counts.execution,
      });
    }
    if (benchmark) {
      console.log(
        JSON.stringify({
          fixture: `iris-action-${status}-reporting-failures`,
          results,
        })
      );
    }
  }
);

test("an execution that failed is not repeated when its terminal write fails", async () => {
  const run = await fixture();
  run.state.alreadyExisted = false;
  run.state.executionFails = true;
  run.state.terminalWriteFailures = 1;
  expect(await run.steps.runIrisTask(taskInput)).toMatchObject({
    status: "failed",
    errorMessage: "fixture execution failed",
  });
  expect(run.counts.execution).toBe(1);
  expect(run.state.status).toBe("failed");
  expect(run.taskWrites.at(-1)).toMatchObject({
    errorMessage: "fixture execution failed",
  });
});

test.each([null, {}, { message: 42 }, { message: "" }])(
  "an existing failed action with unusable error %j retains a diagnostic fallback",
  async (error) => {
    const run = await fixture();
    run.state.status = "failed";
    run.state.error = error;
    const expected =
      "A previous attempt of this action is recorded as failed, so it was not run again";
    expect(await run.steps.runIrisTask(taskInput)).toMatchObject({
      errorMessage: expected,
    });
    expect(run.taskWrites.at(-1)).toMatchObject({ errorMessage: expected });
    expect(run.counts.execution).toBe(0);
  }
);

test("successful action artifacts are reused after a reporting failure", async () => {
  const run = await fixture();
  run.state.alreadyExisted = false;
  run.state.terminalWriteFailures = 1;
  expect(await run.steps.runIrisTask(taskInput)).toEqual({
    taskId: "task-fixture",
    localId: "local-fixture",
    status: "succeeded",
    reused: true,
    artifacts: [artifact],
    costCents: 0,
    errorMessage: null,
  });
  expect(run.counts.execution).toBe(1);
  expect(new Set(run.actionKeys).size).toBe(1);
});
