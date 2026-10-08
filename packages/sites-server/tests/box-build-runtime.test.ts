import {
  afterAll,
  afterEach,
  beforeEach,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";

import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";
import { Deferred, Effect, Exit, Fiber } from "effect";
import { TestClock } from "effect/testing";

import { runSandboxBuild, runSandboxBuildEffect } from "../src/box-build";
import { BUILD_LOG_POLL_MS } from "../src/constants/build";
import {
  SANDBOX_CLEANUP_TIMEOUT_MS,
  SANDBOX_REQUEST_TIMEOUT_MS,
  SANDBOX_LOG_TAIL_SCRIPT,
} from "../src/constants/sandbox";
import * as env from "../src/env";
import { SandboxRequestError } from "../src/schemas/sandbox";
import type {
  SandboxBuildParams,
  SandboxBuildResult,
} from "../src/types/build";
import { redactBuildLog } from "../src/utils/build-log";
import { sandboxRequestEffect } from "../src/utils/sandbox-transport";

const target = {
  siteId: "site",
  deploymentId: "deployment",
  publicOrigin: "https://example.com",
  mounts: { blog: "/blog" },
};
const compilerResult = {
  ok: true,
  diagnostics: [],
  areas: [{ area: "blog", mount: "/blog", durationMs: 4 }],
  fileCount: 1,
  totalBytes: 7,
  redirects: [],
};
const files = new Map<string, string>();
const command = mock(async (_script: string) => ({ result: "exit=0" }));
const remove = mock(async () => {});
const read = mock(async (path: string) => files.get(path) ?? "");
const logTail = mock(async (_path: string, _limit: number) => ({
  output: "",
  exit_code: 0,
}));
const startup = mock(async (_snapshot: string, _config: unknown) => ({
  id: "box-test",
}));
const upload = mock(async () => new Response("ok"));
const download = mock(async () => new Response(new Uint8Array([4, 5])));
const fetchMock = spyOn(globalThis, "fetch");
const key = spyOn(env, "getBoxApiKey");
const snapshot = spyOn(env, "getSitesBuilderSnapshotId");
let completed: SandboxBuildResult | undefined;
const complete = mock(async (build: SandboxBuildResult) => {
  completed = build;
});
const params: SandboxBuildParams = {
  sourceArchive: new Uint8Array([1, 2, 3]),
  rootDirectory: "",
  target,
  onComplete: complete,
};

beforeEach(() => {
  startup.mockReset();
  fetchMock.mockReset();
  completed = undefined;
  files.clear();
  files.set("/workspace/home/result.json", JSON.stringify(compilerResult));
  files.set("/workspace/home/build.log", "compiler final log");
  files.set("/workspace/home/toolchain/VERSION", "v-test");
  files.set("/workspace/home/exit-code", "0");
  files.set(
    "/workspace/home/build-metrics.json",
    JSON.stringify({
      phases: { extract: 1, compile: 4, pack: 2 },
      sandboxCpuTimeMs: 6,
      sandboxMemoryPeakBytes: 1234,
    })
  );
  command.mockReset().mockResolvedValue({ result: "exit=0" });
  remove.mockReset().mockResolvedValue(undefined);
  read.mockReset().mockImplementation(async (path) => files.get(path) ?? "");
  logTail.mockReset().mockImplementation(async (path, limit) => {
    const bytes = Buffer.from(files.get(path) ?? "");
    let start = Math.max(0, bytes.length - limit);
    while (start < bytes.length && ((bytes[start] ?? 0) & 0xc0) === 0x80) {
      start++;
    }
    return { output: bytes.subarray(start).toString("utf8"), exit_code: 0 };
  });
  complete.mockReset().mockImplementation(async (build) => {
    completed = build;
  });
  startup.mockResolvedValue({ id: "box-test" });
  upload.mockReset().mockResolvedValue(new Response("ok"));
  download
    .mockReset()
    .mockImplementation(async () => new Response(new Uint8Array([4, 5])));
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/from-snapshot")) {
      const config = JSON.parse(String(init?.body));
      return Response.json(await startup(config.snapshot_id, config));
    }
    if (url.pathname.endsWith("/files/upload")) {
      return upload();
    }
    if (url.pathname.endsWith("/files/download")) {
      return download();
    }
    if (url.pathname.endsWith("/files/read")) {
      return Response.json({
        content: await read(url.searchParams.get("path") ?? ""),
      });
    }
    if (url.pathname.endsWith("/exec")) {
      const body = JSON.parse(String(init?.body));
      if (body.command[0] === "node") {
        expect(body.command.slice(0, 3)).toEqual([
          "node",
          "-e",
          SANDBOX_LOG_TAIL_SCRIPT,
        ]);
        expect(body.command[4]).toBe(
          String(SITE_BUILD_LIMITS.maxBuildLogBytes)
        );
        return Response.json(
          await logTail(body.command[3], Number(body.command[4]))
        );
      }
      const run = await command(body.command[2]);
      return Response.json({ output: run.result, exit_code: 0 });
    }
    if (init?.method === "DELETE") {
      await remove();
      return new Response();
    }
    throw new Error(`Unexpected route ${url.pathname}`);
  });
  key.mockReturnValue("box-test-secret");
  snapshot.mockReturnValue("snapshot-test");
});

afterEach(() => {
  startup.mockClear();
  fetchMock.mockClear();
});

afterAll(() => {
  fetchMock.mockRestore();
  key.mockRestore();
  snapshot.mockRestore();
});

test("success records lifecycle, guest resources, compiler areas and completion after cleanup", async () => {
  remove.mockImplementation(async () => {
    await setTimeout(8);
  });
  const build = await runSandboxBuild(params);
  expect(completed).toBe(build);
  expect(remove).toHaveBeenCalledTimes(1);
  expect(complete).toHaveBeenCalledTimes(1);
  expect(build.metrics).toMatchObject({
    version: 1,
    provider: "upstash",
    requestedSize: "medium",
    snapshotId: "snapshot-test",
    sandboxId: "box-test",
    sourceArchiveBytes: 3,
    outputArchiveBytes: 2,
    sandboxCpuTimeMs: 6,
    sandboxMemoryPeakBytes: 1234,
    exitCode: 0,
    cleanupSucceeded: true,
    compilerAreas: compilerResult.areas,
  });
  for (const phase of [
    "sandboxStartup",
    "sourceUpload",
    "execution",
    "resultRead",
    "outputDownload",
    "cleanup",
    "extract",
    "compile",
    "pack",
  ] as const) {
    expect(build.metrics?.phases[phase]).toBeGreaterThanOrEqual(0);
  }
  expect(build.metrics?.totalDurationMs).toBeGreaterThan(build.durationMs);
  expect(build.log).toBe("compiler final log");
  expect(JSON.stringify(build.metrics)).not.toContain("compiler final log");
  expect(startup.mock.calls[0]?.[1]).toMatchObject({
    size: "medium",
    network_policy: { mode: "deny-all" },
    ephemeral: true,
    ttl: SITE_BUILD_LIMITS.buildTimeoutSeconds + 5 * 60,
  });
  expect(command.mock.calls[0]?.[0]).toContain("node -e");
});

test("startup failure still completes with redacted metrics and preserves the original exception", async () => {
  const error = new Error(
    "SDK failed box-test-secret Authorization: Bearer abc"
  );
  startup.mockRejectedValueOnce(error);
  await expect(runSandboxBuild(params)).rejects.toThrow(
    "SDK failed [REDACTED] Authorization: [REDACTED] [REDACTED]"
  );
  startup.mockRejectedValueOnce(error);
  const failure = await runSandboxBuild(params).catch(
    (cause: unknown) => cause
  );
  expect(failure).toBeInstanceOf(SandboxRequestError);
  expect(failure).toMatchObject({ operation: "create", status: null });
  expect(JSON.stringify(failure)).not.toContain("box-test-secret");
  expect(JSON.stringify(failure)).not.toContain("abc");
  expect(failure).not.toHaveProperty("cause");
  expect(completed?.metrics?.sandboxId).toBeNull();
  expect(completed?.metrics?.phases.sandboxStartup).toBeGreaterThanOrEqual(0);
  expect(completed?.metrics?.cleanupSucceeded).toBe(false);
  expect(remove).not.toHaveBeenCalled();
  expect(completed?.log).toContain("[build:lifecycle]");
  expect(completed?.log).not.toContain("box-test-secret");
  expect(completed?.log).not.toContain("abc");
});

test("upload failure captures logs and deletes the sandbox", async () => {
  const error = new Error("upload network failure");
  upload.mockRejectedValueOnce(error);
  await expect(runSandboxBuild(params)).rejects.toMatchObject({
    _tag: "SandboxRequestError",
    operation: "upload",
    status: null,
    message: error.message,
  });
  expect(remove).toHaveBeenCalledTimes(1);
  expect(completed?.log).toContain("compiler final log");
  expect(completed?.log).toContain("upload network failure");
  expect(completed?.metrics?.phases.sourceUpload).toBeGreaterThanOrEqual(0);
});

test("command SDK failure captures the final bounded log and does not let callback failure hide it", async () => {
  const error = new Error("command transport failed");
  command.mockRejectedValueOnce(error);
  complete.mockImplementationOnce(async (build) => {
    completed = build;
    throw new Error("database unavailable");
  });
  files.set(
    "/workspace/home/build.log",
    `${"a".repeat(SITE_BUILD_LIMITS.maxBuildLogBytes + 100)} final compiler output box-test-secret`
  );
  await expect(runSandboxBuild(params)).rejects.toMatchObject({
    _tag: "SandboxRequestError",
    operation: "exec",
    status: null,
    message: error.message,
  });
  expect(completed?.log.length).toBeLessThanOrEqual(
    SITE_BUILD_LIMITS.maxBuildLogBytes
  );
  expect(completed?.log).toContain("final compiler output [REDACTED]");
  expect(completed?.log).toContain("command transport failed");
  expect(completed?.metrics?.phases.execution).toBeGreaterThanOrEqual(0);
  expect(remove).toHaveBeenCalledTimes(1);
});

test("invalid and unreadable result retain crash semantics and final logs", async () => {
  files.set("/workspace/home/result.json", "invalid json");
  files.set("/workspace/home/exit-code", "124");
  const timedOut = await runSandboxBuild(params);
  expect(timedOut.result).toBeNull();
  expect(timedOut.crash).toContain("longer than");
  expect(timedOut.metrics?.exitCode).toBe(124);
  read.mockImplementation(async (path) => {
    if (path.endsWith("result.json")) {
      throw new Error("read failed");
    }
    return files.get(path) ?? "";
  });
  const unreadable = await runSandboxBuild(params);
  expect(unreadable.result).toBeNull();
  expect(unreadable.log).toContain("compiler final log");
  expect(unreadable.log).toContain("[build:read:result.json] read failed");
});

test("compiler failure skips download and missing guest counters remain null", async () => {
  files.set(
    "/workspace/home/result.json",
    JSON.stringify({ ...compilerResult, ok: false })
  );
  files.delete("/workspace/home/build-metrics.json");
  const build = await runSandboxBuild(params);
  expect(build.result?.ok).toBe(false);
  expect(build.outputArchive).toBeNull();
  expect(build.metrics?.sandboxCpuTimeMs).toBeNull();
  expect(build.metrics?.outputArchiveBytes).toBeNull();
  expect(upload).toHaveBeenCalledTimes(1);
  expect(download).not.toHaveBeenCalled();
});

test("download failures propagate after cleanup and preserve the lifecycle log", async () => {
  const error = new Error("download transport failed");
  download.mockRejectedValueOnce(error);
  await expect(runSandboxBuild(params)).rejects.toMatchObject({
    _tag: "SandboxRequestError",
    operation: "download",
    status: null,
    message: error.message,
  });
  expect(completed?.log).toContain("download transport failed");
  expect(completed?.metrics?.phases.outputDownload).toBeGreaterThanOrEqual(0);
  expect(completed?.metrics?.cleanupSucceeded).toBe(true);
});

test("cleanup failure is logged without hiding the result and completion sees measured cleanup", async () => {
  remove.mockRejectedValueOnce(new Error("delete failed box-test-secret"));
  const build = await runSandboxBuild(params);
  expect(build.result?.ok).toBe(true);
  expect(build.metrics?.cleanupSucceeded).toBe(false);
  expect(build.log).toContain("[build:cleanup] delete failed [REDACTED]");
  expect(completed?.metrics?.phases.cleanup).toBeGreaterThanOrEqual(0);
});

test("callback failure propagates when the build did not throw", async () => {
  const error = new Error("database write failed");
  complete.mockRejectedValueOnce(error);
  await expect(runSandboxBuild(params)).rejects.toBe(error);
  expect(remove).toHaveBeenCalledTimes(1);
});

test("invalid root never starts a sandbox but still completes instrumentation", async () => {
  await expect(
    runSandboxBuild({ ...params, rootDirectory: "../escape" })
  ).rejects.toThrow("Invalid root directory");
  expect(startup).not.toHaveBeenCalled();
  expect(completed?.metrics?.totalDurationMs).toBeGreaterThanOrEqual(0);
});

test("shared redaction preserves deployment markers and redacts explicit secrets and auth patterns", () => {
  const log = redactBuildLog(
    "[deployment:build-failed] token-secret\nBearer credentials\napi_key=foo password='bar'",
    ["token-secret"]
  );
  expect(log).toStartWith("[deployment:build-failed]");
  expect(log).not.toContain("token-secret");
  expect(log).not.toContain("credentials");
  expect(log).not.toContain("foo");
  expect(log).not.toContain("bar");
});

test("logs above 2 MiB retain their newest UTF-8 compiler output through the real bounded tail script", async () => {
  const directory = mkdtempSync(join(tmpdir(), "notra-log-tail-"));
  const path = join(directory, "build.log");
  const source = `${"💡".repeat(800_000)}\nnewest compiler sentinel 💡 box-test-secret`;
  writeFileSync(path, source);
  logTail.mockImplementationOnce(async (remotePath, limit) => {
    expect(remotePath).toBe("/workspace/home/build.log");
    const run = spawnSync(
      "node",
      ["-e", SANDBOX_LOG_TAIL_SCRIPT, path, String(limit)],
      {
        encoding: "utf8",
        maxBuffer: limit + 4096,
      }
    );
    expect(run.status).toBe(0);
    expect(run.stderr).toBe("");
    return { output: run.stdout, exit_code: run.status ?? 1 };
  });
  try {
    expect(Buffer.byteLength(source)).toBeGreaterThan(2 * 1024 * 1024);
    const build = await runSandboxBuild(params);
    expect(build.log).toContain("newest compiler sentinel 💡 [REDACTED]");
    expect(build.log).not.toContain("box-test-secret");
    expect(build.log).not.toContain("�");
    expect(Buffer.byteLength(build.log)).toBeLessThanOrEqual(512 * 1024);
    expect(completed?.log).toBe(build.log);
    expect(command).toHaveBeenCalledTimes(1);
    expect(logTail).toHaveBeenCalledTimes(1);
    expect(read.mock.calls.some(([file]) => file.endsWith("build.log"))).toBe(
      false
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("log tail transport accommodates worst-case JSON escaping without downloading the full log", async () => {
  files.set(
    "/workspace/home/build.log",
    `${"\0".repeat(3 * 1024 * 1024)}tail sentinel 💡 box-test-secret`
  );
  const build = await runSandboxBuild(params);
  expect(build.log).toContain("tail sentinel 💡 [REDACTED]");
  expect(build.log).not.toContain("box-test-secret");
  expect(Buffer.byteLength(build.log)).toBeLessThanOrEqual(
    SITE_BUILD_LIMITS.maxBuildLogBytes
  );
  expect(command).toHaveBeenCalledTimes(1);
});

test("a failed log tail command cannot authorize its output and retains the execution fallback", async () => {
  logTail.mockResolvedValueOnce({ output: "untrusted tail", exit_code: 1 });
  const build = await runSandboxBuild(params);
  expect(build.log).toContain("exit=0");
  expect(build.log).toContain(
    "[build:read:build.log] Sandbox log tail exited with code 1"
  );
  expect(build.log).not.toContain("untrusted tail");
  expect(build.result?.ok).toBe(true);
});

test("synchronously throwing completion callback cannot replace a prior failure", async () => {
  const original = new Error("startup failure");
  startup.mockRejectedValueOnce(original);
  await expect(
    runSandboxBuild({
      ...params,
      onComplete: () => {
        throw new Error("callback failure");
      },
    })
  ).rejects.toMatchObject({
    _tag: "SandboxRequestError",
    operation: "create",
    status: null,
    message: original.message,
  });
});

test("live callback remains incremental and redacted while completion gets the final log", async () => {
  files.set("/workspace/home/build.log", "live box-test-secret");
  const onLog = mock(async (_log: string) => {});
  command.mockImplementationOnce(async () => {
    await setTimeout(2200);
    files.set("/workspace/home/build.log", "final compiler log");
    return { result: "exit=0" };
  });
  const build = await runSandboxBuild({ ...params, onLog });
  expect(onLog).toHaveBeenCalledWith("live [REDACTED]");
  expect(onLog).toHaveBeenCalledTimes(1);
  expect(build.log).toBe("final compiler log");
});

test("successful compiler result cannot authorize output after packing failure or a missing exit code", async () => {
  for (const exitText of ["3", "", "not-an-exit-code"]) {
    fetchMock.mockClear();
    upload.mockClear();
    download.mockClear();
    files.set("/workspace/home/exit-code", exitText);
    const build = await runSandboxBuild(params);
    expect(build.result).toBeNull();
    expect(build.crash).toContain(
      exitText === "3" ? "exit code 3" : "did not report an execution exit code"
    );
    expect(build.outputArchive).toBeNull();
    expect(build.metrics?.outputArchiveBytes).toBeNull();
    expect(build.metrics?.phases.outputDownload).toBeUndefined();
    expect(build.metrics?.compilerAreas).toMatchObject(compilerResult.areas);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(download).not.toHaveBeenCalled();
    expect(completed?.result).toBeNull();
    expect(build.metrics?.cleanupSucceeded).toBe(true);
  }
});

test("redaction removes URL userinfo and bare token query, form and JSON credentials", () => {
  const log = redactBuildLog(
    [
      "postgresql://synthetic-user:synthetic-password@database.example/db",
      "https://synthetic-url-token@provider.example/error",
      "https://provider.example/error?token=synthetic-query-token",
      "token=synthetic-form-token",
      '{"token":"synthetic-json-token"}',
    ].join("\n")
  );
  for (const secret of [
    "synthetic-user",
    "synthetic-password",
    "synthetic-url-token",
    "synthetic-query-token",
    "synthetic-form-token",
    "synthetic-json-token",
  ]) {
    expect(log).not.toContain(secret);
  }
  expect(log).toContain("postgresql://[REDACTED]@database.example/db");
  expect(log).toContain("https://[REDACTED]@provider.example/error");
});

test("URL redaction handles large unbroken build logs without quadratic scheme matching", () => {
  const log = "x".repeat(512 * 1024);
  expect(redactBuildLog(log)).toBe(log);
  const dottedLog = "x.".repeat(256 * 1024);
  expect(redactBuildLog(dottedLog)).toBe(dottedLog);
});

test("stopping a hung log body cancels its reader before result reads and deletion", async () => {
  let cancelled = false;
  let firstLog = true;
  const defaultFetch = fetchMock.getMockImplementation();
  await Effect.runPromise(
    Effect.gen(function* () {
      const reading = yield* Deferred.make<void>();
      const executing = yield* Deferred.make<void>();
      const finish = yield* Deferred.make<void>();
      fetchMock.mockImplementation(async (input, init) => {
        const url = new URL(String(input));
        const body = url.pathname.endsWith("/exec")
          ? JSON.parse(String(init?.body))
          : null;
        if (url.pathname.endsWith("/exec") && body?.command[0] === "sh") {
          Effect.runSync(Deferred.succeed(executing, undefined));
          await Effect.runPromise(Deferred.await(finish));
          return Response.json({ output: "done", exit_code: 0 });
        }
        if (body?.command[0] === "node" && firstLog) {
          firstLog = false;
          return new Response(
            new ReadableStream({
              pull() {
                Effect.runSync(Deferred.succeed(reading, undefined));
              },
              cancel() {
                cancelled = true;
              },
            })
          );
        }
        return (
          defaultFetch?.(input, init) ?? new Response(null, { status: 500 })
        );
      });
      const fiber = yield* runSandboxBuildEffect({
        ...params,
        onComplete: undefined,
        onLog: () => Effect.void,
      }).pipe(Effect.forkScoped);
      yield* Deferred.await(executing);
      yield* TestClock.adjust(BUILD_LOG_POLL_MS);
      yield* Deferred.await(reading);
      yield* Deferred.succeed(finish, undefined);
      const build = yield* Fiber.join(fiber);
      expect(cancelled).toBe(true);
      expect(build.result?.ok).toBe(true);
      expect(remove).toHaveBeenCalledTimes(1);
    }).pipe(Effect.scoped, Effect.provide(TestClock.layer()))
  );
});

test("parent interruption aborts exec, joins polling cleanup, and completes after deletion", async () => {
  let aborted = false;
  const defaultFetch = fetchMock.getMockImplementation();
  await Effect.runPromise(
    Effect.gen(function* () {
      const executing = yield* Deferred.make<void>();
      fetchMock.mockImplementation((input, init) => {
        if (
          String(input).endsWith("/exec") &&
          JSON.parse(String(init?.body)).command[0] === "sh"
        ) {
          init?.signal?.addEventListener("abort", () => {
            aborted = true;
          });
          Effect.runSync(Deferred.succeed(executing, undefined));
          return new Promise<Response>(() => {});
        }
        return (
          defaultFetch?.(input, init) ??
          Promise.resolve(new Response(null, { status: 500 }))
        );
      });
      const fiber = yield* runSandboxBuildEffect({
        ...params,
        onLog: () => Effect.void,
        onComplete: (build) =>
          Effect.sync(() => {
            completed = build;
            throw new Error("completion defect");
          }),
      }).pipe(Effect.forkScoped);
      yield* Deferred.await(executing);
      yield* Fiber.interrupt(fiber);
      const exit = yield* Fiber.await(fiber);
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(
          exit.cause.reasons.every((reason) => reason._tag === "Interrupt")
        ).toBe(true);
      }
      expect(aborted).toBe(true);
      expect(remove).toHaveBeenCalledTimes(1);
      expect(completed?.metrics?.cleanupSucceeded).toBe(true);
      expect(completed?.metrics?.phases.execution).toBeGreaterThanOrEqual(0);
      expect(completed?.metrics?.phases.cleanup).toBeGreaterThanOrEqual(0);
      expect(completed?.metrics?.totalDurationMs).toBeGreaterThanOrEqual(0);
    }).pipe(Effect.scoped, Effect.provide(TestClock.layer()))
  );
});

test("cleanup has a finite budget and cannot claim a timed-out deletion succeeded", async () => {
  let aborted = false;
  const defaultFetch = fetchMock.getMockImplementation();
  await Effect.runPromise(
    Effect.gen(function* () {
      const deleting = yield* Deferred.make<void>();
      fetchMock.mockImplementation((input, init) => {
        if (init?.method === "DELETE") {
          init.signal?.addEventListener("abort", () => {
            aborted = true;
          });
          Effect.runSync(Deferred.succeed(deleting, undefined));
          return new Promise<Response>(() => {});
        }
        return (
          defaultFetch?.(input, init) ??
          Promise.resolve(new Response(null, { status: 500 }))
        );
      });
      const fiber = yield* runSandboxBuildEffect({
        ...params,
        onLog: undefined,
        onComplete: undefined,
      }).pipe(Effect.forkScoped);
      yield* Deferred.await(deleting);
      yield* TestClock.adjust(SANDBOX_CLEANUP_TIMEOUT_MS);
      const build = yield* Fiber.join(fiber);
      expect(aborted).toBe(true);
      expect(build.result?.ok).toBe(true);
      expect(build.metrics?.cleanupSucceeded).toBe(false);
      expect(build.metrics?.phases.cleanup).toBeGreaterThanOrEqual(0);
      expect(build.log).toContain("[build:cleanup] Sandbox cleanup timed out");
    }).pipe(Effect.scoped, Effect.provide(TestClock.layer()))
  );
});

test("interruption during allocation waits for a known ID and deletes it without uploading", async () => {
  const defaultFetch = fetchMock.getMockImplementation();
  await Effect.runPromise(
    Effect.gen(function* () {
      const creating = yield* Deferred.make<void>();
      const deliver = yield* Deferred.make<void>();
      fetchMock.mockImplementation(async (input, init) => {
        if (String(input).endsWith("/from-snapshot")) {
          Effect.runSync(Deferred.succeed(creating, undefined));
          await Effect.runPromise(Deferred.await(deliver));
          return Response.json({ id: "box-test" });
        }
        return (
          defaultFetch?.(input, init) ?? new Response(null, { status: 500 })
        );
      });
      const fiber = yield* runSandboxBuildEffect({
        ...params,
        onLog: undefined,
        onComplete: (build) =>
          Effect.sync(() => {
            completed = build;
          }),
      }).pipe(Effect.forkScoped);
      yield* Deferred.await(creating);
      const interrupting = yield* Fiber.interrupt(fiber).pipe(
        Effect.forkChild({ startImmediately: true })
      );
      yield* Deferred.succeed(deliver, undefined);
      yield* Fiber.join(interrupting);
      expect(Exit.isFailure(yield* Fiber.await(fiber))).toBe(true);
      expect(upload).not.toHaveBeenCalled();
      expect(remove).toHaveBeenCalledTimes(1);
      expect(completed?.metrics?.sandboxId).toBe("box-test");
      expect(completed?.metrics?.cleanupSucceeded).toBe(true);
      expect(completed?.metrics?.phases.sandboxStartup).toBeGreaterThanOrEqual(
        0
      );
    }).pipe(Effect.scoped, Effect.provide(TestClock.layer()))
  );
});

test("a provider response arriving after allocation timeout triggers bounded orphan cleanup", async () => {
  let aborted = false;
  const defaultFetch = fetchMock.getMockImplementation();
  await Effect.runPromise(
    Effect.gen(function* () {
      const creating = yield* Deferred.make<void>();
      const deliver = yield* Deferred.make<void>();
      const deleted = yield* Deferred.make<void>();
      fetchMock.mockImplementation(async (input, init) => {
        if (String(input).endsWith("/from-snapshot")) {
          init?.signal?.addEventListener("abort", () => {
            aborted = true;
          });
          Effect.runSync(Deferred.succeed(creating, undefined));
          await Effect.runPromise(Deferred.await(deliver));
          return Response.json({ id: "box-late" });
        }
        if (init?.method === "DELETE") {
          expect(String(input)).toEndWith("/v2/box/box-late");
          Effect.runSync(Deferred.succeed(deleted, undefined));
          return new Response();
        }
        return (
          defaultFetch?.(input, init) ?? new Response(null, { status: 500 })
        );
      });
      const fiber = yield* runSandboxBuildEffect({
        ...params,
        onLog: undefined,
        onComplete: (build) =>
          Effect.sync(() => {
            completed = build;
          }),
      }).pipe(Effect.forkScoped);
      yield* Deferred.await(creating);
      yield* TestClock.adjust(SANDBOX_REQUEST_TIMEOUT_MS);
      expect(Exit.isFailure(yield* Fiber.await(fiber))).toBe(true);
      expect(aborted).toBe(true);
      expect(completed?.metrics?.cleanupSucceeded).toBe(false);
      expect(completed?.metrics?.sandboxId).toBeNull();
      yield* Deferred.succeed(deliver, undefined);
      yield* Deferred.await(deleted);
      expect(upload).not.toHaveBeenCalled();
    }).pipe(Effect.scoped, Effect.provide(TestClock.layer()))
  );
});

test("parent cancellation during an unknown allocation is bounded and never reports cleanup success", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const creating = yield* Deferred.make<void>();
      let signal: AbortSignal | null | undefined;
      fetchMock.mockImplementation((_input, init) => {
        signal = init?.signal;
        Effect.runSync(Deferred.succeed(creating, undefined));
        return new Promise<Response>(() => {});
      });
      const fiber = yield* runSandboxBuildEffect({
        ...params,
        onLog: undefined,
        onComplete: (build) =>
          Effect.sync(() => {
            completed = build;
          }),
      }).pipe(Effect.forkScoped);
      yield* Deferred.await(creating);
      const interrupting = yield* Fiber.interrupt(fiber).pipe(
        Effect.forkChild({ startImmediately: true })
      );
      yield* TestClock.adjust(SANDBOX_REQUEST_TIMEOUT_MS);
      yield* Fiber.join(interrupting);
      const exit = yield* Fiber.await(fiber);
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(
          exit.cause.reasons.every((reason) => reason._tag === "Interrupt")
        ).toBe(true);
      }
      expect(signal?.aborted).toBe(true);
      expect(completed?.metrics?.sandboxId).toBeNull();
      expect(completed?.metrics?.cleanupSucceeded).toBe(false);
      expect(completed?.metrics?.phases.sandboxStartup).toBeGreaterThanOrEqual(
        0
      );
      expect(completed?.metrics?.phases.cleanup).toBeGreaterThanOrEqual(0);
      expect(upload).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    }).pipe(Effect.scoped, Effect.provide(TestClock.layer()))
  );
});

test("native completion failure is visible after success and completion interruption cannot replace a primary failure", async () => {
  const completionError = new Error("native completion failed");
  const successful = await Effect.runPromiseExit(
    runSandboxBuildEffect({
      ...params,
      onLog: undefined,
      onComplete: () => Effect.fail(completionError),
    })
  );
  expect(Exit.isFailure(successful)).toBe(true);
  if (Exit.isFailure(successful)) {
    expect(successful.cause.reasons).toHaveLength(1);
    const reason = successful.cause.reasons[0];
    expect(reason?._tag).toBe("Fail");
    if (reason?._tag === "Fail") {
      expect(reason.error).toBe(completionError);
    }
  }
  expect(remove).toHaveBeenCalledTimes(1);
  startup.mockRejectedValueOnce(new Error("primary box-test-secret"));
  const failed = await Effect.runPromiseExit(
    runSandboxBuildEffect({
      ...params,
      onLog: undefined,
      onComplete: () => Effect.interrupt,
    })
  );
  expect(Exit.isFailure(failed)).toBe(true);
  if (Exit.isFailure(failed)) {
    expect(failed.cause.reasons).toHaveLength(1);
    const reason = failed.cause.reasons[0];
    expect(reason?._tag).toBe("Fail");
    if (reason?._tag === "Fail") {
      expect(reason.error).toMatchObject({
        _tag: "SandboxRequestError",
        operation: "create",
        message: "primary [REDACTED]",
      });
    }
  }
});

test("native completion interruption after success remains interruption", async () => {
  const exit = await Effect.runPromiseExit(
    runSandboxBuildEffect({
      ...params,
      onLog: undefined,
      onComplete: () => Effect.interrupt,
    })
  );
  expect(Exit.isFailure(exit)).toBe(true);
  if (Exit.isFailure(exit)) {
    expect(
      exit.cause.reasons.every((reason) => reason._tag === "Interrupt")
    ).toBe(true);
  }
  expect(remove).toHaveBeenCalledTimes(1);
});

test("an empty allocation ID is rejected before any upload or deletion", async () => {
  startup.mockResolvedValueOnce({ id: "" });
  await expect(runSandboxBuild(params)).rejects.toMatchObject({
    _tag: "SandboxRequestError",
    operation: "create",
    message: "Sandbox returned an invalid create response",
  });
  expect(upload).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
  expect(completed?.metrics?.sandboxId).toBeNull();
  expect(completed?.metrics?.cleanupSucceeded).toBe(false);
});

test("late recovery defects have an explicit sanitized failure disposition and dispose bodies", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const creating = yield* Deferred.make<void>();
      const deliver = yield* Deferred.make<void>();
      const supervised = yield* Deferred.make<void>();
      let disposed = false;
      let disposition:
        | { id: string | null; cleaned: boolean; diagnostic?: string }
        | undefined;
      fetchMock.mockImplementation(async (input, init) => {
        if (String(input).endsWith("/from-snapshot")) {
          Effect.runSync(Deferred.succeed(creating, undefined));
          await Effect.runPromise(Deferred.await(deliver));
          return Response.json({ id: "box-late-defect" });
        }
        expect(init?.method).toBe("DELETE");
        expect(String(input)).toEndWith("/v2/box/box-late-defect");
        const response = new Response(
          new ReadableStream({
            cancel() {
              disposed = true;
            },
          })
        );
        Object.defineProperty(response, "status", {
          get() {
            throw new Error("defect box-test-secret Bearer sensitive");
          },
        });
        return response;
      });
      const fiber = yield* sandboxRequestEffect(
        "box-test-secret",
        "create",
        "from-snapshot",
        "POST",
        "{}",
        undefined,
        undefined,
        (id, cleaned, diagnostic) => {
          disposition = { id, cleaned, diagnostic };
          Effect.runSync(Deferred.succeed(supervised, undefined));
        }
      ).pipe(Effect.forkScoped);
      yield* Deferred.await(creating);
      yield* TestClock.adjust(SANDBOX_REQUEST_TIMEOUT_MS);
      expect(Exit.isFailure(yield* Fiber.await(fiber))).toBe(true);
      yield* Deferred.succeed(deliver, undefined);
      yield* Deferred.await(supervised);
      expect(disposed).toBe(true);
      expect(disposition).toEqual({
        id: "box-late-defect",
        cleaned: false,
        diagnostic: "Late sandbox recovery failed; its TTL still applies",
      });
      expect(JSON.stringify(disposition)).not.toContain("box-test-secret");
      expect(JSON.stringify(disposition)).not.toContain("sensitive");
    }).pipe(Effect.scoped, Effect.provide(TestClock.layer()))
  );
});
