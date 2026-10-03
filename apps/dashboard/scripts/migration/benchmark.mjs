import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { cpus, platform, totalmem } from "node:os";
import { dirname, join, relative } from "node:path";

import { BUILD_CACHE_PATHS } from "./constants/environment.mjs";
import { loadConfig } from "./utils/benchmark-config.mjs";
import { measureHttp } from "./utils/measure-http.mjs";
import {
  assertNoDotenv,
  sanitizedEnvironment,
} from "./utils/sanitized-environment.mjs";
import { timingSummary } from "./utils/timing-summary.mjs";

const [mode, configPath] = process.argv.slice(2);
const config = loadConfig(mode, configPath);
const env = sanitizedEnvironment();
assertNoDotenv(config.cwd);
if (existsSync(config.output)) {
  throw new Error("Refusing to overwrite an existing benchmark result");
}
if (
  BUILD_CACHE_PATHS.includes(relative(config.cwd, config.output).split("/")[0])
) {
  throw new Error(
    "Benchmark results must be outside cleared build directories"
  );
}
const revision = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: config.cwd,
  env,
  encoding: "utf8",
});
const status = spawnSync("git", ["status", "--porcelain"], {
  cwd: config.cwd,
  env,
  encoding: "utf8",
});
const result = {
  schemaVersion: 1,
  mode,
  config,
  startedAt: new Date().toISOString(),
  revision: revision.status === 0 ? revision.stdout.trim() : null,
  dirty: status.status === 0 ? Boolean(status.stdout.trim()) : null,
  harnessSha256: readdirSync(import.meta.dirname, { recursive: true })
    .filter((path) => path.endsWith(".mjs"))
    .sort()
    .reduce(
      (hash, path) =>
        hash.update(path).update(readFileSync(join(import.meta.dirname, path))),
      createHash("sha256")
    )
    .digest("hex"),
  runtime: process.version,
  platform: platform(),
  cpu: cpus()[0]?.model,
  logicalCpus: cpus().length,
  totalMemoryBytes: totalmem(),
  environmentProfile: "local-placeholder-v1",
  samples: [],
  summary: null,
};
mkdirSync(dirname(config.output), { recursive: true });
writeFileSync(config.output, JSON.stringify(result, null, 2));
let failed = false;
if (mode === "build") {
  for (let index = 0; index < config.samples; index += 1) {
    for (const cachePath of BUILD_CACHE_PATHS) {
      rmSync(join(config.cwd, cachePath), { recursive: true, force: true });
    }
    const start = performance.now();
    const run = spawnSync(config.command[0], config.command.slice(1), {
      cwd: config.cwd,
      env,
      stdio: "inherit",
      timeout: config.timeoutMs,
      killSignal: "SIGKILL",
    });
    const sample = {
      index,
      totalMs: performance.now() - start,
      exitCode: run.status,
      signal: run.signal,
      error: run.error?.name ?? null,
    };
    result.samples.push(sample);
    writeFileSync(config.output, JSON.stringify(result, null, 2));
    if (run.status !== 0) {
      failed = true;
      break;
    }
  }
  result.summary = timingSummary(
    result.samples
      .filter((sample) => sample.exitCode === 0)
      .map((sample) => sample.totalMs)
  );
} else {
  for (const route of config.routes) {
    const url = new URL(route.path, config.baseUrl).href;
    for (let index = -config.warmup; index < config.samples; index += 1) {
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- samples are timed one at a time
      const timing = await measureHttp(url, config.timeoutMs);
      const accepted = route.statuses.includes(timing.status);
      failed ||= !accepted;
      result.samples.push({
        route: route.path,
        index,
        warmup: index < 0,
        accepted,
        ...timing,
      });
      writeFileSync(config.output, JSON.stringify(result, null, 2));
    }
  }
  result.summary = Object.fromEntries(
    config.routes.map((route) => {
      const samples = result.samples.filter(
        (sample) =>
          sample.route === route.path && !sample.warmup && sample.accepted
      );
      return [
        route.path,
        {
          headers: timingSummary(samples.map((sample) => sample.headersMs)),
          total: timingSummary(samples.map((sample) => sample.totalMs)),
        },
      ];
    })
  );
}
writeFileSync(
  config.output,
  JSON.stringify({ ...result, passed: !failed }, null, 2)
);
process.exitCode = failed ? 1 : 0;
