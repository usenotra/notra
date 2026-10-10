import { saveRun, createRunId } from "../store/runs";
import type {
  AnySuite,
  CallResult,
  Contender,
  EvalCase,
  EvalRun,
  RunConfig,
  TaskResult,
} from "../types/eval";
import { demoCall } from "./demo";

const SAVE_THROTTLE_MS = 750;

export interface RunHandle {
  readonly run: EvalRun;
  readonly done: Promise<EvalRun>;
  cancel(): void;
}

export interface StartRunOptions {
  suite: AnySuite;
  config: RunConfig;
  /** Called after every task state change. The run object is mutated in place. */
  onUpdate?: (run: EvalRun) => void;
  /** Re-run only these tasks of an existing run (retry errors). */
  resume?: EvalRun;
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const cause =
      error.cause instanceof Error ? ` (cause: ${error.cause.message})` : "";
    const name = error.name && error.name !== "Error" ? `${error.name}: ` : "";
    return `${name}${error.message}${cause}`.slice(0, 2000);
  }
  return String(error).slice(0, 2000);
}

function buildTasks(suite: AnySuite, config: RunConfig): TaskResult[] {
  const wanted = new Set(config.caseIds ?? []);
  const cases = suite.cases.filter(
    (testCase) => wanted.size === 0 || wanted.has(testCase.id)
  );
  const tasks: TaskResult[] = [];
  // Interleave contenders so every model progresses at the same pace.
  for (let repeat = 0; repeat < config.repeats; repeat += 1) {
    for (const testCase of cases) {
      for (const contender of config.contenders) {
        tasks.push({
          contenderKey: contender.key,
          caseId: testCase.id,
          repeat,
          status: "queued",
        });
      }
    }
  }
  return tasks;
}

async function executeTask(
  suite: AnySuite,
  config: RunConfig,
  task: TaskResult,
  contender: Contender,
  testCase: EvalCase<unknown, unknown>,
  runSignal: AbortSignal
): Promise<void> {
  const signal = AbortSignal.any([
    runSignal,
    AbortSignal.timeout(suite.timeoutMs),
  ]);
  task.status = "running";
  task.startedAt = Date.now();
  const startedAt = performance.now();

  try {
    if (!task.called) {
      const result: CallResult<unknown> = config.demo
        ? await demoCall(suite, testCase, contender, signal)
        : await suite.run(testCase.input, {
            contender,
            abortSignal: signal,
            demo: false,
          });
      task.durationMs = Math.round(performance.now() - startedAt);
      task.output = result.output;
      task.usage = result.usage;
      task.costUsd = result.costUsd;
      task.costSource = result.costSource;
      task.reportedCostUsd = result.reportedCostUsd;
      task.estimatedCostUsd = result.estimatedCostUsd;
      task.transcript = result.transcript;
      task.called = true;
    }
  } catch (error) {
    task.durationMs = Math.round(performance.now() - startedAt);
    task.status = "error";
    task.error =
      signal.aborted && !runSignal.aborted
        ? `Timed out after ${suite.timeoutMs}ms`
        : describeError(error);
    return;
  }

  try {
    task.score = await suite.score(task.output, testCase, {
      abortSignal: runSignal,
      demo: config.demo,
    });
    task.status = "done";
  } catch (error) {
    task.status = "error";
    task.error = `Scoring failed: ${describeError(error)}`;
  }
}

export function startRun(options: StartRunOptions): RunHandle {
  const { suite, config, onUpdate } = options;
  const controller = new AbortController();

  const run: EvalRun = options.resume ?? {
    id: createRunId(suite.id, config.demo),
    config,
    suiteName: suite.name,
    suiteKind: suite.kind,
    createdAt: new Date().toISOString(),
    status: "running",
    tasks: buildTasks(suite, config),
  };
  run.status = "running";
  run.finishedAt = undefined;

  if (options.resume) {
    for (const task of run.tasks) {
      if (task.status === "done") {
        continue;
      }
      // Keep a finished model call so only its scoring is retried.
      Object.assign(
        task,
        task.called
          ? { status: "queued", error: undefined, score: undefined }
          : {
              status: "queued",
              error: undefined,
              durationMs: undefined,
              score: undefined,
              output: undefined,
              transcript: undefined,
            }
      );
    }
  }

  const contenders = new Map(config.contenders.map((item) => [item.key, item]));
  const cases = new Map(suite.cases.map((item) => [item.id, item]));

  let lastSave = 0;
  let pendingSave: ReturnType<typeof setTimeout> | undefined;
  // Saves run one after another so an older snapshot never overwrites a newer one.
  let saveChain: Promise<void> = Promise.resolve();
  const enqueueSave = () => {
    saveChain = saveChain.then(() => saveRun(run)).catch(() => undefined);
    return saveChain;
  };
  const persist = (force = false) => {
    const elapsed = Date.now() - lastSave;
    if (force || elapsed >= SAVE_THROTTLE_MS) {
      clearTimeout(pendingSave);
      pendingSave = undefined;
      lastSave = Date.now();
      enqueueSave();
      return;
    }
    pendingSave ??= setTimeout(() => persist(true), SAVE_THROTTLE_MS - elapsed);
  };

  const notify = () => {
    onUpdate?.(run);
    persist();
  };

  const queue = run.tasks.filter((task) => task.status === "queued");

  const worker = async () => {
    while (!controller.signal.aborted) {
      const task = queue.shift();
      if (!task) {
        return;
      }
      const contender = contenders.get(task.contenderKey);
      const testCase = cases.get(task.caseId);
      if (!contender || !testCase) {
        task.status = "error";
        task.error = "Case or contender no longer exists in this suite.";
        notify();
        continue;
      }
      const running = executeTask(
        suite,
        config,
        task,
        contender,
        testCase,
        controller.signal
      );
      notify();
      await running;
      notify();
    }
  };

  const done = (async () => {
    const workers = Array.from(
      { length: Math.max(1, Math.min(config.concurrency, queue.length)) },
      worker
    );
    await Promise.all(workers);
    if (controller.signal.aborted) {
      for (const task of run.tasks) {
        if (task.status === "queued" || task.status === "running") {
          task.status = "error";
          task.error = "Cancelled";
        }
      }
      run.status = "cancelled";
    } else {
      run.status = "done";
    }
    run.finishedAt = new Date().toISOString();
    onUpdate?.(run);
    clearTimeout(pendingSave);
    await enqueueSave();
    return run;
  })();

  persist(true);

  return {
    run,
    done,
    cancel: () => controller.abort(),
  };
}
