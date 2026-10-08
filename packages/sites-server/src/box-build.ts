import { performance } from "node:perf_hooks";

import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";
import {
  siteBuildRequestSchema,
  siteBuildResultSchema,
} from "@notra/sites-core/schemas/build";
import { Effect, Exit, Fiber, Schedule } from "effect";

import {
  BOX_TTL_SECONDS,
  BOX_WORKDIR,
  BUILD_LOG_POLL_MS,
  BUILD_TIMEOUT_EXIT_CODE,
} from "./constants/build";
import { GUEST_BUILD_RUNNER } from "./constants/build-runner";
import {
  SANDBOX_CLEANUP_TIMEOUT_MS,
  SANDBOX_EXEC_TIMEOUT_MS,
  SANDBOX_LOG_RESPONSE_BYTES,
  SANDBOX_LOG_TAIL_SCRIPT,
} from "./constants/sandbox";
import { getBoxApiKey, getSitesBuilderSnapshotId } from "./env";
import { guestBuildTelemetrySchema } from "./schemas/build-telemetry";
import {
  sandboxAllocationSchema,
  sandboxExecutionSchema,
  sandboxFileSchema,
  SandboxRequestError,
} from "./schemas/sandbox";
import type {
  SandboxBuildEffectParams,
  SandboxBuildParams,
  SandboxBuildResult,
  SandboxUploadFile,
} from "./types/build";
import { boundBuildLog } from "./utils/bound-build-log";
import { redactBuildLog } from "./utils/build-log";
import { errorMessage } from "./utils/errors";
import { safeJson } from "./utils/json";
import { isSafeRootDirectory } from "./utils/root-directory";
import { runSitesEffect } from "./utils/run-sites-effect";
import { measureSandboxPhase } from "./utils/sandbox-phase";
import {
  sandboxJsonEffect,
  sandboxRequestEffect,
} from "./utils/sandbox-transport";
import { shellQuote } from "./utils/shell";

const uploadBytesEffect = Effect.fn("Sites.Sandbox.upload")(function* (
  apiKey: string,
  boxId: string,
  files: SandboxUploadFile[]
) {
  const form = new FormData();
  for (const file of files) {
    form.append("paths", file.path);
    form.append(
      "files",
      new Blob([file.data]),
      file.path.split("/").pop() ?? "file"
    );
  }
  yield* sandboxRequestEffect(
    apiKey,
    "upload",
    `${encodeURIComponent(boxId)}/files/upload`,
    "POST",
    form
  );
});

const downloadBytesEffect = Effect.fn("Sites.Sandbox.download")(function* (
  apiKey: string,
  boxId: string,
  path: string,
  maxBytes: number
) {
  return yield* sandboxRequestEffect(
    apiKey,
    "download",
    `${encodeURIComponent(boxId)}/files/download?folder=${encodeURIComponent(path)}`,
    "GET",
    undefined,
    maxBytes
  );
});

export function downloadBytes(boxId: string, path: string, maxBytes: number) {
  return runSitesEffect(
    Effect.suspend(() =>
      downloadBytesEffect(getBoxApiKey(), boxId, path, maxBytes)
    )
  );
}

const readFileEffect = Effect.fn("Sites.Sandbox.readFile")(function* (
  apiKey: string,
  boxId: string,
  path: string
) {
  const bytes = yield* sandboxRequestEffect(
    apiKey,
    "read",
    `${encodeURIComponent(boxId)}/files/read?path=${encodeURIComponent(path)}`,
    "GET"
  );
  const result = yield* sandboxJsonEffect(bytes, sandboxFileSchema, "read");
  return result.content;
});

const readLogEffect = Effect.fn("Sites.Sandbox.readLog")(function* (
  apiKey: string,
  boxId: string
) {
  const bytes = yield* sandboxRequestEffect(
    apiKey,
    "readLog",
    `${encodeURIComponent(boxId)}/exec`,
    "POST",
    JSON.stringify({
      command: [
        "node",
        "-e",
        SANDBOX_LOG_TAIL_SCRIPT,
        `${BOX_WORKDIR}/build.log`,
        String(SITE_BUILD_LIMITS.maxBuildLogBytes),
      ],
    }),
    SANDBOX_LOG_RESPONSE_BYTES
  );
  const run = yield* sandboxJsonEffect(
    bytes,
    sandboxExecutionSchema,
    "readLog"
  );
  if (run.exit_code !== 0) {
    return yield* Effect.fail(
      new SandboxRequestError({
        operation: "readLog",
        status: null,
        message: `Sandbox log tail exited with code ${run.exit_code}`,
      })
    );
  }
  return run.output ?? "";
});

function crashReason(exitText: string | null, wroteResult: boolean): string {
  if (exitText?.trim() === String(BUILD_TIMEOUT_EXIT_CODE)) {
    return `The build took longer than ${SITE_BUILD_LIMITS.buildTimeoutSeconds / 60} minutes`;
  }
  return wroteResult
    ? "The build produced an invalid result."
    : "The build stopped before it produced a result. See the build log.";
}

export const runSandboxBuildEffect = Effect.fn("Sites.Sandbox.build")(
  function* (params: SandboxBuildEffectParams) {
    const startedAt = Date.now();
    const monotonicStart = performance.now();
    const metrics: NonNullable<SandboxBuildResult["metrics"]> = {
      version: 1,
      provider: "upstash",
      snapshotId: null,
      sandboxId: null,
      requestedSize: "medium",
      sourceArchiveBytes: params.sourceArchive.byteLength,
      outputArchiveBytes: null,
      totalDurationMs: 0,
      phases: {},
      sandboxCpuTimeMs: null,
      sandboxMemoryPeakBytes: null,
      exitCode: null,
      cleanupSucceeded: false,
    };
    const build: SandboxBuildResult = {
      result: null,
      crash: null,
      log: "",
      outputArchive: null,
      toolchainVersion: null,
      durationMs: 0,
      metrics,
    };
    let boxId: string | null = null;
    let apiKey = "";
    let readResult = false;
    let runOutput = "";
    let lifecycleLog = "";
    const boundedLog = (log: string) =>
      boundBuildLog(redactBuildLog(log, [apiKey]));
    const appendError = (stage: string, error: unknown) => {
      lifecycleLog = boundedLog(
        `${lifecycleLog}\n[build:${stage}] ${errorMessage(error)}\n`
      );
    };
    const readBuildFiles = () =>
      Effect.gen(function* () {
        const currentBox = boxId;
        if (!currentBox) {
          return;
        }
        yield* measureSandboxPhase(
          metrics,
          "resultRead",
          Effect.gen(function* () {
            const paths = [
              "result.json",
              "build.log",
              "toolchain/VERSION",
              "exit-code",
              "build-metrics.json",
            ];
            const [resultText, logText, versionText, exitText, telemetryText] =
              yield* Effect.forEach(
                paths,
                (path) =>
                  (path === "build.log"
                    ? readLogEffect(apiKey, currentBox)
                    : readFileEffect(
                        apiKey,
                        currentBox,
                        `${BOX_WORKDIR}/${path}`
                      )
                  ).pipe(
                    Effect.catch((error) =>
                      Effect.sync(() => {
                        appendError(`read:${path}`, error);
                        return null;
                      })
                    )
                  ),
                { concurrency: 5 }
              );
            build.log = boundedLog(logText || runOutput);
            build.toolchainVersion = versionText?.trim() ?? null;
            const parsed = resultText
              ? siteBuildResultSchema.safeParse(safeJson(resultText))
              : null;
            build.result = parsed?.success ? parsed.data : null;
            build.crash = parsed?.success
              ? null
              : crashReason(exitText ?? null, parsed !== null);
            if (build.result) {
              metrics.compilerAreas = build.result.areas;
            }
            const exitCode = exitText?.trim() ? Number(exitText.trim()) : null;
            metrics.exitCode =
              exitCode !== null && Number.isInteger(exitCode) ? exitCode : null;
            if (build.result?.ok && metrics.exitCode !== 0) {
              build.result = null;
              if (metrics.exitCode === null) {
                build.crash =
                  "The build did not report an execution exit code. See the build log.";
              } else if (metrics.exitCode === BUILD_TIMEOUT_EXIT_CODE) {
                build.crash = crashReason(exitText ?? null, true);
              } else {
                build.crash = `The build stopped with exit code ${metrics.exitCode}. See the build log.`;
              }
            }
            const telemetry = telemetryText
              ? guestBuildTelemetrySchema.safeParse(safeJson(telemetryText))
              : null;
            if (telemetry?.success) {
              Object.assign(metrics.phases, telemetry.data.phases);
              metrics.sandboxCpuTimeMs = telemetry.data.sandboxCpuTimeMs;
              metrics.sandboxMemoryPeakBytes =
                telemetry.data.sandboxMemoryPeakBytes;
            }
            readResult = true;
          })
        );
      });
    const workflow = Effect.gen(function* () {
      if (!isSafeRootDirectory(params.rootDirectory)) {
        return yield* Effect.fail(
          new Error(`Invalid root directory "${params.rootDirectory}"`)
        );
      }
      yield* measureSandboxPhase(
        metrics,
        "sandboxStartup",
        Effect.gen(function* () {
          apiKey = yield* Effect.try({
            try: getBoxApiKey,
            catch: (error) => error,
          });
          metrics.snapshotId = yield* Effect.try({
            try: getSitesBuilderSnapshotId,
            catch: (error) => error,
          });
          const allocated = yield* sandboxRequestEffect(
            apiKey,
            "create",
            "from-snapshot",
            "POST",
            JSON.stringify({
              snapshot_id: metrics.snapshotId,
              ephemeral: true,
              name: `notra-site-${params.target.deploymentId.slice(0, 16)}`,
              size: "medium",
              ttl: BOX_TTL_SECONDS,
              network_policy: { mode: "deny-all" },
            }),
            undefined,
            undefined,
            (id, cleaned, diagnostic) => {
              metrics.sandboxId = id;
              metrics.cleanupSucceeded = cleaned;
              if (!cleaned) {
                appendError(
                  "cleanup",
                  diagnostic ??
                    "Late sandbox allocation could not be deleted; its TTL still applies"
                );
                build.log = boundedLog(build.log + lifecycleLog);
              }
            }
          ).pipe(
            Effect.flatMap((bytes) =>
              sandboxJsonEffect(bytes, sandboxAllocationSchema, "create")
            ),
            Effect.tap((allocation) =>
              Effect.sync(() => {
                boxId = allocation.id;
                metrics.sandboxId = allocation.id;
              })
            ),
            (allocation) =>
              Effect.uninterruptibleMask((restore) =>
                allocation.pipe(
                  Effect.exit,
                  Effect.flatMap((exit) => restore(exit))
                )
              )
          );
          boxId = allocated.id;
        })
      );
      const currentBoxId = boxId;
      if (!currentBoxId) {
        return yield* Effect.fail(
          new Error("Sandbox allocation is unavailable")
        );
      }
      yield* measureSandboxPhase(
        metrics,
        "sourceUpload",
        Effect.gen(function* () {
          const target = yield* Effect.try({
            try: () => siteBuildRequestSchema.parse(params.target),
            catch: (error) => error,
          });
          yield* uploadBytesEffect(apiKey, currentBoxId, [
            { path: `${BOX_WORKDIR}/source.tgz`, data: params.sourceArchive },
            {
              path: `${BOX_WORKDIR}/target.json`,
              data: new TextEncoder().encode(JSON.stringify(target)),
            },
          ]);
        })
      );

      const sourceDir = params.rootDirectory
        ? `../src/${params.rootDirectory}`
        : "../src";
      const script = [
        `cd ${BOX_WORKDIR} || exit 3`,
        "rm -rf src out out.tgz result.json build.log exit-code build-metrics.json",
        "mkdir -p src",
        `node -e ${shellQuote(GUEST_BUILD_RUNNER)} -- ${shellQuote(sourceDir)} ${SITE_BUILD_LIMITS.buildTimeoutSeconds}`,
      ].join("\n");
      const onLog = params.onLog;
      let lastLog = "";
      const follower = onLog
        ? yield* readLogEffect(apiKey, currentBoxId).pipe(
            Effect.flatMap((log) => {
              const bounded = boundedLog(log);
              if (!bounded || bounded === lastLog) {
                return Effect.void;
              }
              lastLog = bounded;
              return Effect.suspend(() => onLog(bounded));
            }),
            Effect.ignore,
            Effect.repeat(Schedule.spaced(BUILD_LOG_POLL_MS)),
            Effect.delay(BUILD_LOG_POLL_MS),
            Effect.forkScoped
          )
        : null;
      const execution = performance.now();
      const executionBoxId = currentBoxId;
      const execute = Effect.gen(function* () {
        const bytes = yield* sandboxRequestEffect(
          apiKey,
          "exec",
          `${encodeURIComponent(executionBoxId)}/exec`,
          "POST",
          JSON.stringify({ command: ["sh", "-c", script] }),
          undefined,
          SANDBOX_EXEC_TIMEOUT_MS
        );
        const run = yield* sandboxJsonEffect(
          bytes,
          sandboxExecutionSchema,
          "exec"
        );
        runOutput = boundedLog(String(run.error || run.output || ""));
      }).pipe(
        Effect.ensuring(
          Effect.gen(function* () {
            metrics.phases.execution = performance.now() - execution;
            if (follower) {
              yield* Fiber.interrupt(follower);
            }
          })
        )
      );
      yield* execute;
      yield* readBuildFiles();
      build.durationMs = Date.now() - startedAt;
      if (build.result?.ok) {
        yield* measureSandboxPhase(
          metrics,
          "outputDownload",
          Effect.gen(function* () {
            build.outputArchive = yield* downloadBytesEffect(
              apiKey,
              currentBoxId,
              `${BOX_WORKDIR}/out.tgz`,
              SITE_BUILD_LIMITS.maxOutputBytes
            );
            metrics.outputArchiveBytes = build.outputArchive.byteLength;
          })
        );
      }
      return build;
    });
    const protectedWorkflow = workflow.pipe(
      Effect.catch((error) =>
        Effect.gen(function* () {
          appendError("lifecycle", error);
          if (boxId && !readResult) {
            yield* readBuildFiles().pipe(
              Effect.match({
                onFailure: (readError) => appendError("read", readError),
                onSuccess: () => undefined,
              })
            );
          }
          build.crash = boundedLog(errorMessage(error));
          if (build.durationMs === 0) {
            build.durationMs = Date.now() - startedAt;
          }
          return yield* Effect.fail(error);
        })
      )
    );
    const ownedWorkflow = Effect.gen(function* () {
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          const cleanup = performance.now();
          if (boxId) {
            yield* sandboxRequestEffect(
              apiKey,
              "cleanup",
              encodeURIComponent(boxId),
              "DELETE",
              undefined,
              undefined,
              SANDBOX_CLEANUP_TIMEOUT_MS
            ).pipe(
              Effect.match({
                onFailure: (error) => appendError("cleanup", error),
                onSuccess: () => {
                  metrics.cleanupSucceeded = true;
                },
              })
            );
          }
          metrics.phases.cleanup = performance.now() - cleanup;
          build.log = boundedLog(build.log + lifecycleLog);
          metrics.totalDurationMs = performance.now() - monotonicStart;
          if (build.durationMs === 0) {
            build.durationMs = Date.now() - startedAt;
          }
        })
      );
      return yield* protectedWorkflow;
    }).pipe(Effect.scoped);
    return yield* ownedWorkflow.pipe(
      Effect.onExit((exit) => {
        const onComplete = params.onComplete;
        if (!onComplete) {
          return Effect.void;
        }
        const completion = Effect.suspend(() => onComplete(build));
        return Exit.isFailure(exit)
          ? completion.pipe(Effect.exit, Effect.asVoid)
          : completion;
      })
    );
  }
);

export function runSandboxBuild(
  params: SandboxBuildParams
): Promise<SandboxBuildResult> {
  const onLog = params.onLog;
  const onComplete = params.onComplete;
  return runSitesEffect(
    runSandboxBuildEffect({
      ...params,
      onLog: onLog
        ? (log) =>
            Effect.tryPromise({
              try: () => onLog(log),
              catch: (error) => error,
            })
        : undefined,
      onComplete: onComplete
        ? (build) =>
            Effect.tryPromise({
              try: () => onComplete(build),
              catch: (error) => error,
            })
        : undefined,
    })
  );
}
