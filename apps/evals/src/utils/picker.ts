import { CONTENDER_CATALOG, contenderFromId } from "../constants/contenders";
import {
  COST_INCLUDED_IN,
  DEFAULT_VOLUME,
  MAX_ERROR_RATE,
  MIN_CASES,
} from "../constants/picker";
import type { ModelPrice } from "../models/pricing";
import type { AnySuite, EvalRun, TaskResult } from "../types/eval";
import type {
  Candidate,
  MeasuredModel,
  ModelEvidence,
  PickerSettings,
  SuitePick,
} from "../types/picker";
import { mean, percentile } from "./stats";

/** Per-call spend reads badly at classifier prices, so show it per 1k calls. */
export function formatPerThousand(costPerCall: number): string {
  const usd = costPerCall * 1000;
  if (usd <= 0) {
    return "$0";
  }
  return usd < 10 ? `$${usd.toFixed(2)}` : `$${usd.toFixed(0)}`;
}

export function createPickerSettings(): PickerSettings {
  return { tolerancePts: 2, volumes: {} };
}

function standardError(values: readonly number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const avg = mean(values);
  let squares = 0;
  for (const value of values) {
    squares += (value - avg) ** 2;
  }
  return Math.sqrt(squares / (values.length - 1) / values.length);
}

function evidenceFromTasks(
  modelId: string,
  run: EvalRun,
  tasks: readonly TaskResult[]
): MeasuredModel {
  const finished = tasks.filter((task) => task.status === "done");
  const attempted = tasks.filter(
    (task) => task.status === "done" || task.status === "error"
  );
  const errors = attempted.length - finished.length;
  let spend = 0;
  for (const task of attempted) {
    spend += task.costUsd ?? 0;
  }
  const scores = finished.map((task) => task.score?.score ?? 0);
  const contender = run.config.contenders.find(
    (item) => item.modelId === modelId
  );
  return {
    modelId,
    label: contender?.label ?? contenderFromId(modelId).label,
    runId: run.id,
    runAt: run.createdAt,
    cases: finished.length,
    errors,
    errorRate: attempted.length ? errors / attempted.length : 0,
    score: mean(scores),
    scoreSe: standardError(scores),
    passRate: mean(finished.map((task) => (task.score?.pass ? 1 : 0))),
    p50Ms: percentile(
      finished.map((task) => task.durationMs ?? 0).filter((ms) => ms > 0),
      50
    ),
    costPerCall: attempted.length ? spend / attempted.length : 0,
  };
}

/** Latest run per model for this suite, matching the demo/live mode. */
export function collectEvidence(
  runs: readonly EvalRun[],
  suiteId: string,
  demo: boolean
): MeasuredModel[] {
  const latest = new Map<string, MeasuredModel>();
  const ordered = [...runs].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  for (const run of ordered) {
    if (run.config.suiteId !== suiteId || run.config.demo !== demo) {
      continue;
    }
    for (const contender of run.config.contenders) {
      if (latest.has(contender.modelId)) {
        continue;
      }
      const tasks = run.tasks.filter(
        (task) => task.contenderKey === contender.key
      );
      if (!tasks.some((task) => task.status === "done")) {
        continue;
      }
      latest.set(
        contender.modelId,
        evidenceFromTasks(contender.modelId, run, tasks)
      );
    }
  }
  return [...latest.values()];
}

/** Not beaten by any model that is at least as good and at most as cheap. */
function isOnFrontier(
  item: Pick<ModelEvidence, "score" | "costPerCall">,
  all: readonly Pick<ModelEvidence, "score" | "costPerCall">[]
): boolean {
  return !all.some(
    (other) =>
      other !== item &&
      other.score >= item.score &&
      other.costPerCall <= item.costPerCall &&
      (other.score > item.score || other.costPerCall < item.costPerCall)
  );
}

function averageTokens(
  runs: readonly EvalRun[],
  suiteId: string,
  demo: boolean
) {
  let input = 0;
  let output = 0;
  let count = 0;
  for (const run of runs) {
    if (run.config.suiteId !== suiteId || run.config.demo !== demo) {
      continue;
    }
    for (const task of run.tasks) {
      if (task.status === "done" && task.usage) {
        input += task.usage.inputTokens;
        output += task.usage.outputTokens;
        count += 1;
      }
    }
  }
  return count ? { input: input / count, output: output / count } : undefined;
}

export function pickForSuite({
  suite,
  runs,
  demo,
  settings,
  prices,
}: {
  suite: AnySuite;
  runs: readonly EvalRun[];
  demo: boolean;
  settings: PickerSettings;
  prices: Readonly<Record<string, ModelPrice>>;
}): SuitePick {
  const raw = collectEvidence(runs, suite.id, demo);
  const minCases = Math.min(MIN_CASES, suite.cases.length);
  const trusted = raw.filter(
    (item) => item.cases >= minCases && item.errorRate <= MAX_ERROR_RATE
  );
  const bestScore = Math.max(0, ...trusted.map((item) => item.score));
  const bar = bestScore - settings.tolerancePts / 100;

  const evidence: ModelEvidence[] = raw
    .map((item) => {
      let blocker: string | undefined;
      if (item.cases < minCases) {
        blocker = `only ${item.cases} cases`;
      } else if (item.errorRate > MAX_ERROR_RATE) {
        blocker = `${Math.round(item.errorRate * 100)}% errors`;
      } else if (item.score < bar) {
        blocker = `${((bestScore - item.score) * 100).toFixed(1)} pts below best`;
      }
      return {
        ...item,
        frontier: trusted.includes(item) && isOnFrontier(item, trusted),
        eligible: blocker === undefined,
        blocker,
      };
    })
    .sort((a, b) => a.costPerCall - b.costPerCall);

  // Cheapest model that clears the bar; latency breaks ties.
  const recommended = evidence
    .filter((item) => item.eligible)
    .sort((a, b) => a.costPerCall - b.costPerCall || a.p50Ms - b.p50Ms)[0];
  const production = evidence.find(
    (item) => item.modelId === suite.productionModel
  );

  const tokens = averageTokens(runs, suite.id, demo);
  const measured = new Set(evidence.map((item) => item.modelId));
  const ceiling = recommended?.costPerCall ?? Number.POSITIVE_INFINITY;
  const candidates: Candidate[] = tokens
    ? CONTENDER_CATALOG.filter(
        (item) => item.kind === "llm" && !measured.has(item.modelId)
      )
        .flatMap((item) => {
          const price = prices[item.modelId];
          if (!price) {
            return [];
          }
          const estCostPerCall =
            tokens.input * price.input + tokens.output * price.output;
          return estCostPerCall < ceiling
            ? [{ modelId: item.modelId, label: item.label, estCostPerCall }]
            : [];
        })
        .sort((a, b) => a.estCostPerCall - b.estCostPerCall)
    : [];

  const volume = settings.volumes[suite.id] ?? DEFAULT_VOLUME;
  const includedIn = COST_INCLUDED_IN[suite.id];
  return {
    suite,
    evidence,
    production,
    recommended,
    bestScore,
    candidates,
    volume,
    includedIn,
    smallSample: recommended ? recommended.cases < MIN_CASES : false,
    monthlyNow:
      production && !includedIn ? production.costPerCall * volume : undefined,
    monthlyRecommended:
      recommended && !includedIn ? recommended.costPerCall * volume : undefined,
  };
}

/** Models worth a verification run: prod, the pick, the frontier, 2 candidates. */
export function verificationModels(pick: SuitePick): string[] {
  const ids = new Set<string>([pick.suite.productionModel]);
  if (pick.recommended) {
    ids.add(pick.recommended.modelId);
  }
  for (const item of pick.evidence) {
    if (item.frontier) {
      ids.add(item.modelId);
    }
  }
  for (const item of pick.candidates.slice(0, 2)) {
    ids.add(item.modelId);
  }
  return [...ids];
}
