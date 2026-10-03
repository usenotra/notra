import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { RUNS_DIR } from "../constants/paths";
import type { EvalRun } from "../types/eval";

function runPath(id: string): string {
  return join(RUNS_DIR, `${id}.json`);
}

export function createRunId(suiteId: string, demo: boolean): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${stamp}_${suiteId}${demo ? "_demo" : ""}`;
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
