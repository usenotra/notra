import type {
  Contender,
  ContenderSummary,
  EvalRun,
  TaskResult,
} from "../types/eval";

export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return sorted[index] ?? 0;
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const value of values) {
    sum += value;
  }
  return sum / values.length;
}

export function summarizeContender(
  contender: Contender,
  tasks: readonly TaskResult[]
): ContenderSummary {
  const own = tasks.filter((task) => task.contenderKey === contender.key);
  const finished = own.filter((task) => task.status === "done");
  const latencies = finished
    .map((task) => task.durationMs ?? 0)
    .filter((value) => value > 0);

  const fieldScores = new Map<string, number[]>();
  for (const task of finished) {
    for (const field of task.score?.fields ?? []) {
      const list = fieldScores.get(field.field) ?? [];
      list.push(field.score);
      fieldScores.set(field.field, list);
    }
  }
  const fieldAccuracy: Record<string, number> = {};
  for (const [field, scores] of fieldScores) {
    fieldAccuracy[field] = mean(scores);
  }

  let costUsd = 0;
  let judgeCostUsd = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  for (const task of own) {
    costUsd += task.costUsd ?? 0;
    judgeCostUsd += task.score?.judgeCostUsd ?? 0;
    inputTokens += task.usage?.inputTokens ?? 0;
    outputTokens += task.usage?.outputTokens ?? 0;
  }

  return {
    contenderKey: contender.key,
    label: contender.label,
    total: own.length,
    done: finished.length,
    errors: own.filter((task) => task.status === "error").length,
    running: own.filter((task) => task.status === "running").length,
    accuracy: mean(finished.map((task) => task.score?.score ?? 0)),
    passRate: mean(finished.map((task) => (task.score?.pass ? 1 : 0))),
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
    costUsd,
    judgeCostUsd,
    inputTokens,
    outputTokens,
    fieldAccuracy,
    latencies,
  };
}

export function summarizeRun(run: EvalRun): ContenderSummary[] {
  return run.config.contenders.map((contender) =>
    summarizeContender(contender, run.tasks)
  );
}

export interface ConfusionMatrix {
  readonly labels: readonly string[];
  /** counts[expected][actual] */
  readonly counts: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly max: number;
}

export function confusionMatrix(
  tasks: readonly TaskResult[],
  contenderKey: string,
  field: string
): ConfusionMatrix {
  const counts = new Map<string, Map<string, number>>();
  const labels = new Set<string>();
  let max = 0;

  for (const task of tasks) {
    if (task.contenderKey !== contenderKey || task.status !== "done") {
      continue;
    }
    const fieldScore = task.score?.fields.find((item) => item.field === field);
    if (!fieldScore || fieldScore.expected === undefined) {
      continue;
    }
    const expected = fieldScore.expected;
    const actual = fieldScore.actual ?? "∅";
    labels.add(expected);
    labels.add(actual);
    const row = counts.get(expected) ?? new Map<string, number>();
    const next = (row.get(actual) ?? 0) + 1;
    row.set(actual, next);
    counts.set(expected, row);
    max = Math.max(max, next);
  }

  return { labels: [...labels].sort(), counts, max };
}

export function formatMs(ms: number): string {
  if (ms <= 0) {
    return "–";
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`;
}

export function formatUsd(usd: number): string {
  if (usd <= 0) {
    return "$0";
  }
  if (usd < 0.01) {
    return `$${usd.toFixed(4)}`;
  }
  return `$${usd.toFixed(3)}`;
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
