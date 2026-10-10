/**
 * bun --no-env-file scripts/bench-ai-cost.ts --baseline /path/to/clean-baseline
 * Add --output /path/to/report.json to save the JSON report instead of stdout.
 * Both checkouts must already have the same dependencies installed.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import type {
  BenchmarkResult,
  RevisionResult,
} from "./ai-cost/types/benchmark";
import { sha256 } from "./ai-cost/utils/measure";

const { values } = parseArgs({
  options: {
    baseline: { type: "string" },
    candidate: { type: "string", default: process.cwd() },
    output: { type: "string" },
  },
});
assert.ok(values.baseline, "Pass --baseline /path/to/clean-baseline-checkout");
const temporary = await mkdtemp(join(tmpdir(), "notra-ai-cost-"));
const results: Record<string, RevisionResult> = {};

try {
  for (const [label, directory] of [
    ["baseline", values.baseline],
    ["candidate", values.candidate],
  ] as const) {
    const root = resolve(directory);
    const git = (...args: string[]) =>
      execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
    const revision = git("rev-parse", "HEAD").trim();
    const status = git("status", "--porcelain");
    const beforeDiff = git("diff", "HEAD");
    assert.ok(
      label !== "baseline" || !status,
      "Baseline checkout must be clean"
    );
    const output = join(temporary, `${label}.json`);
    const worker = spawnSync(
      process.execPath,
      [
        "--no-env-file",
        "--no-install",
        "test",
        "--isolate",
        fileURLToPath(new URL("ai-cost/worker.test.ts", import.meta.url)),
      ],
      {
        cwd: root,
        env: {
          PATH: process.env.PATH ?? "",
          NODE_ENV: "test",
          NOTRA_AI_COST_ROOT: root,
          NOTRA_AI_COST_OUTPUT: output,
        },
        encoding: "utf8",
        timeout: 45_000,
      }
    );
    assert.equal(
      worker.status,
      0,
      `${label} benchmark failed: ${worker.error ?? ""}\n${worker.stdout}\n${worker.stderr}`
    );
    const result: BenchmarkResult = JSON.parse(await readFile(output, "utf8"));
    assert.equal(
      git("rev-parse", "HEAD").trim(),
      revision,
      `${label} revision changed during run`
    );
    assert.equal(
      git("diff", "HEAD"),
      beforeDiff,
      `${label} tracked source changed during run; rerun after edits finish`
    );
    results[label] = {
      ...result,
      revision,
      dirty: Boolean(status),
      diffSha256: sha256(beforeDiff),
    };
  }
  assert.deepEqual(
    results.baseline?.runtime,
    results.candidate?.runtime,
    "Both revisions must use the same Bun/AI SDK versions"
  );
  assert.equal(
    results.baseline?.fixtureSha256,
    results.candidate?.fixtureSha256
  );
  const harnessDirectory = fileURLToPath(new URL("ai-cost/", import.meta.url));
  const harnessFiles = (await readdir(harnessDirectory, { recursive: true }))
    .filter((name) => name.endsWith(".ts"))
    .sort();
  const harnessSource = await Promise.all(
    harnessFiles.map(
      async (name) =>
        `${name}\n${await readFile(join(harnessDirectory, name), "utf8")}`
    )
  );
  const report = JSON.stringify(
    {
      scope:
        "Offline production-boundary benchmark: feedback API submission across all eight supplied-field combinations plus evaluation failure, using real API admission and classifiers with in-memory inserts; GEO judge contexts; prompt/payload bytes; tool-cache recovery; synthetic route-cost accounting. Prefix measurements call the classifier directly. GEO fixtures are not full persisted scans. No real quality/latency/spend claims.",
      harnessSha256: sha256(
        `${await readFile(fileURLToPath(import.meta.url), "utf8")}\n${harnessSource.join("\n")}`
      ),
      results,
    },
    null,
    2
  );
  if (values.output) {
    await writeFile(resolve(values.output), `${report}\n`);
  } else {
    console.log(report);
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
