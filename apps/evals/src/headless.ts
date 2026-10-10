import { contenderFromId } from "./constants/contenders";
import { allPrices } from "./models/pricing";
import { startRun } from "./runner/run-eval";
import { loadPickerSettings } from "./store/picker-settings";
import { listRuns } from "./store/runs";
import { getSuite, SUITES } from "./suites/registry";
import type { EvalRun } from "./types/eval";
import { pad, padStart } from "./utils/charts";
import { formatPerThousand, pickForSuite } from "./utils/picker";
import { formatMs, formatPct, formatUsd, summarizeRun } from "./utils/stats";

export interface HeadlessArgs {
  suiteId: string;
  models?: string[];
  repeats: number;
  concurrency: number;
  demo: boolean;
  caseIds?: string[];
  json: boolean;
}

function printSummary(run: EvalRun) {
  const rows = summarizeRun(run).sort((a, b) => b.accuracy - a.accuracy);
  console.log(
    `\n${pad("model", 28)}${padStart("score", 8)}${padStart("pass", 8)}${padStart("p50", 9)}${padStart("p95", 9)}${padStart("cost", 10)} ${pad("source", 10)}${padStart("errors", 8)}`
  );
  for (const row of rows) {
    console.log(
      `${pad(row.label, 28)}${padStart(formatPct(row.accuracy), 8)}${padStart(formatPct(row.passRate), 8)}${padStart(formatMs(row.p50Ms), 9)}${padStart(formatMs(row.p95Ms), 9)}${padStart(formatUsd(row.costUsd), 10)} ${pad(row.costSource, 10)}${padStart(String(row.errors), 8)}`
    );
    const fields = Object.entries(row.fieldAccuracy)
      .map(([field, value]) => `${field} ${formatPct(value)}`)
      .join("  ");
    if (fields) {
      console.log(`  ${fields}`);
    }
  }
  const errors = run.tasks.filter((task) => task.status === "error");
  for (const task of errors.slice(0, 10)) {
    console.log(`  ✗ ${task.contenderKey} ${task.caseId}: ${task.error}`);
  }
  if (errors.length > 10) {
    console.log(`  … ${errors.length - 10} more errors`);
  }
}

export async function runHeadless(args: HeadlessArgs): Promise<number> {
  const suite = getSuite(args.suiteId);
  if (!suite) {
    console.error(
      `Unknown suite "${args.suiteId}". Available: ${SUITES.map((item) => item.id).join(", ")}`
    );
    return 1;
  }
  const contenders = (
    args.models?.length ? args.models : suite.defaultContenders
  ).map(contenderFromId);
  const handle = startRun({
    suite,
    config: {
      suiteId: suite.id,
      contenders,
      repeats: args.repeats,
      concurrency: args.concurrency,
      demo: args.demo,
      caseIds: args.caseIds,
    },
  });

  let lastFinished = 0;
  const timer = setInterval(() => {
    const finished = handle.run.tasks.filter(
      (task) => task.status === "done" || task.status === "error"
    ).length;
    if (finished !== lastFinished && !args.json) {
      lastFinished = finished;
      const errors = handle.run.tasks.filter(
        (task) => task.status === "error"
      ).length;
      console.log(
        `[${suite.id}] ${finished}/${handle.run.tasks.length} done, ${errors} errors`
      );
    }
  }, 1000);

  const stop = () => handle.cancel();
  process.once("SIGINT", stop);
  const run = await handle.done;
  clearInterval(timer);
  process.removeListener("SIGINT", stop);

  if (args.json) {
    console.log(
      JSON.stringify(
        { id: run.id, status: run.status, summary: summarizeRun(run) },
        null,
        2
      )
    );
  } else {
    console.log(
      `\nRun ${run.id} (${run.status}) saved to apps/evals/.runs/${run.id}.json`
    );
    printSummary(run);
  }
  return run.tasks.some((task) => task.status === "error") ? 2 : 0;
}

export function printSuites() {
  for (const suite of SUITES) {
    console.log(
      `${pad(suite.id, 22)} ${pad(suite.kind, 15)} ${padStart(String(suite.cases.length), 3)} cases  ${suite.stage}`
    );
  }
}

export async function printRuns() {
  for (const run of await listRuns()) {
    const best = summarizeRun(run).sort((a, b) => b.accuracy - a.accuracy)[0];
    console.log(
      `${pad(run.id, 48)} ${pad(run.status, 10)} ${best ? `${best.label} ${formatPct(best.accuracy)}` : ""}`
    );
  }
}

export async function printPicks(args: {
  demo: boolean;
  tolerancePts?: number;
  json: boolean;
}) {
  const [runs, prices, settings] = await Promise.all([
    listRuns(),
    allPrices(),
    loadPickerSettings(),
  ]);
  if (args.tolerancePts !== undefined) {
    settings.tolerancePts = args.tolerancePts;
  }
  const picks = SUITES.map((suite) =>
    pickForSuite({ suite, runs, demo: args.demo, settings, prices })
  );

  if (args.json) {
    console.log(
      JSON.stringify(
        picks.map((pick) => ({
          suite: pick.suite.id,
          production: pick.suite.productionModel,
          recommended: pick.recommended?.modelId ?? null,
          bestScore: pick.bestScore,
          volume: pick.volume,
          monthlyNow: pick.monthlyNow ?? null,
          monthlyRecommended: pick.monthlyRecommended ?? null,
          models: pick.evidence,
          untestedCandidates: pick.candidates,
        })),
        null,
        2
      )
    );
    return;
  }

  console.log(
    `Cheapest model within ${settings.tolerancePts} pts of the best (latest ${args.demo ? "demo" : "live"} run per model)\n`
  );
  for (const pick of picks) {
    const prod = pick.production;
    const next = pick.recommended;
    console.log(
      `${pad(pick.suite.id, 22)} prod ${pad(prod ? `${prod.label} ${formatPct(prod.score)} ${formatPerThousand(prod.costPerCall)}/1k` : `${pick.suite.productionModel} (no data)`, 34)} → ${next ? `${next.label} ${formatPct(next.score)} ${formatPerThousand(next.costPerCall)}/1k` : "no eligible model"}${pick.smallSample ? " (small sample, verify)" : ""}${pick.includedIn ? ` (spend is part of ${pick.includedIn})` : ""}`
    );
    for (const item of pick.evidence) {
      const mark = item.modelId === next?.modelId ? "★" : " ";
      console.log(
        `   ${mark} ${pad(item.label, 22)}${padStart(formatPct(item.score), 7)} ±${(item.scoreSe * 100).toFixed(1).padStart(4)}${padStart(formatPerThousand(item.costPerCall), 10)}/1k${padStart(formatMs(item.p50Ms), 8)}  ${item.blocker ?? (item.frontier ? "frontier" : "")} ${item.costSource}`
      );
    }
    if (pick.candidates.length) {
      console.log(
        `     untested, likely cheaper: ${pick.candidates
          .slice(0, 4)
          .map(
            (item) =>
              `${item.label} ~${formatPerThousand(item.estCostPerCall)}/1k`
          )
          .join(", ")}`
      );
    }
  }
}
