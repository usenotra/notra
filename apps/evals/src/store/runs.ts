import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { RUNS_DIR } from "../constants/paths";
import type { EvalRun } from "../types/eval";

function runPath(id: string): string {
  return join(RUNS_DIR, `${id}.json`);
}

/** Sortable by time; the random suffix keeps same-second runs apart. */
export function createRunId(suiteId: string, demo: boolean): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${stamp}-${suffix}_${suiteId}${demo ? "_demo" : ""}`;
}

/** Atomic write so a crash mid-save never leaves a truncated run file. */
export async function saveRun(run: EvalRun): Promise<void> {
  await mkdir(RUNS_DIR, { recursive: true });
  const target = runPath(run.id);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, JSON.stringify(run, null, 2));
  await rename(temp, target);
}

export async function loadRun(id: string): Promise<EvalRun | undefined> {
  try {
    return JSON.parse(await readFile(runPath(id), "utf8")) as EvalRun;
  } catch {
    return undefined;
  }
}

/**
 * A run still marked running on disk after its process exited (Ctrl+C,
 * crash). Marks it cancelled in memory so it can be retried.
 */
export function markInterrupted(run: EvalRun): EvalRun {
  for (const task of run.tasks) {
    if (task.status === "queued" || task.status === "running") {
      task.status = "error";
      task.error = "Interrupted";
    }
  }
  run.status = "cancelled";
  return run;
}

export async function listRuns(): Promise<EvalRun[]> {
  let files: string[];
  try {
    files = await readdir(RUNS_DIR);
  } catch {
    return [];
  }
  const runs = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map((file) => loadRun(file.slice(0, -".json".length)))
  );
  return runs
    .filter((run): run is EvalRun => run !== undefined)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
