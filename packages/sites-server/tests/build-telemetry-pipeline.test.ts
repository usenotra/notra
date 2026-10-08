import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { SiteBuildMetrics } from "@notra/sites-core/types/build-metrics";
import { Deferred, Effect, Exit, Fiber } from "effect";

import type {
  SandboxBuildEffectParams,
  SandboxBuildResult,
} from "../src/types/build";
import type { SiteDeployment } from "../src/types/deployments";
import type { Site } from "../src/types/sites";

if (process.env.NOTRA_BUILD_TELEMETRY_PIPELINE_WORKER !== "1") {
  test("build pipeline persists telemetry across success and failure", () => {
    const child = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: {
          ...process.env,
          NOTRA_BUILD_TELEMETRY_PIPELINE_WORKER: "1",
          UPSTASH_BOX_API_KEY: "synthetic-box-secret",
        },
        timeout: 30_000,
      }
    );
    expect(child.status, child.stderr?.toString()).toBe(0);
  });
} else {
  const site = { id: "site", status: "active", rootDirectory: "" } as Site;
  let deployment: SiteDeployment;
  let mode:
    | "success"
    | "access"
    | "source"
    | "sandbox"
    | "publish"
    | "interrupted"
    | "compiler" = "success";
  let r2Fails = false;
  let persistenceFails = false;
  let finalPersistenceFails = false;
  let r2Defects = false;
  let sandboxStopped = false;
  let sandboxStarted = Deferred.makeUnsafe<void>();
  let holdActivation = false;
  let activationFinished = false;
  let activationStarted = Promise.resolve();
  let notifyActivation: () => void = () => {};
  let activationReleased = Promise.resolve();
  let releaseActivation: () => void = () => {};
  const sourceFailure = new Error("source failed synthetic-github-secret");
  const logDefect = new Error("log adapter defect");
  const r2Logs: string[] = [];
  const saved: { metrics: SiteBuildMetrics; log: string }[] = [];
  const telemetry = {
    saveBuildTelemetry: async (
      id: string,
      metrics: SiteBuildMetrics,
      log: string
    ) => {
      expect(id).toBe("deployment");
      if (persistenceFails || (finalPersistenceFails && saved.length > 0)) {
        throw new Error(
          "telemetry unavailable synthetic-github-secret Bearer synthetic-box-secret"
        );
      }
      saved.push({ metrics: structuredClone(metrics), log });
    },
  };
  mock.module("../src/build-telemetry", () => ({
    ...telemetry,
    saveBuildTelemetryEffect: (
      ...args: Parameters<typeof telemetry.saveBuildTelemetry>
    ) =>
      Effect.tryPromise({
        try: () => telemetry.saveBuildTelemetry(...args),
        catch: (error) => error,
      }),
  }));
  const r2 = {
    r2Put: async (_key: string, log: string) => {
      r2Logs.push(log);
      if (r2Fails) {
        throw new Error("R2 unavailable");
      }
      return "etag";
    },
  };
  mock.module("../src/r2", () => ({
    ...r2,
    r2PutEffect: (...args: Parameters<typeof r2.r2Put>) =>
      r2Defects
        ? Effect.die(logDefect)
        : Effect.tryPromise({
            try: () => r2.r2Put(...args),
            catch: (error) => error,
          }),
  }));
  mock.module("../src/deployments", () => ({
    getDeployment: async () => deployment,
    hasNewerDeployment: async () => false,
    transitionDeployment: async (
      _id: string,
      status: string,
      values: object = {}
    ) => {
      Object.assign(deployment, values, { status });
      return true;
    },
  }));
  const github = {
    getBranchHead: async () => ({ sha: "sha" }),
    siteRepositoryAccess: async () => {
      if (mode === "access") {
        throw new Error(
          "repository access failed Bearer synthetic-github-secret"
        );
      }
      return { repository: "repo", token: "synthetic-github-secret" };
    },
    downloadRepositoryTarball: async () => {
      if (mode === "source") {
        throw sourceFailure;
      }
      return new Uint8Array([1, 2, 3]);
    },
  };
  mock.module("../src/github", () => ({
    ...github,
    downloadRepositoryTarballEffect: (
      ...args: Parameters<typeof github.downloadRepositoryTarball>
    ) =>
      Effect.tryPromise({
        try: () => github.downloadRepositoryTarball(...args),
        catch: (error) => error,
      }),
  }));
  mock.module("../src/box-build", () => ({
    runSandboxBuildEffect: (params: SandboxBuildEffectParams) =>
      Effect.gen(function* () {
        const build: SandboxBuildResult = {
          result: {
            ok: mode !== "compiler",
            diagnostics: [],
            areas: [],
            fileCount: 1,
            totalBytes: 1,
            redirects: [],
            contentSecurityPolicy: null,
          },
          crash: null,
          log: "compiler output synthetic-github-secret",
          outputArchive: mode === "compiler" ? null : new Uint8Array([1]),
          toolchainVersion: "test-version",
          durationMs: 10,
          metrics: {
            version: 1,
            provider: "upstash",
            snapshotId: "snapshot",
            sandboxId: "box",
            requestedSize: "medium",
            sourceArchiveBytes: 3,
            outputArchiveBytes: 1,
            totalDurationMs: 12,
            phases: { sandboxStartup: 1, compile: 2, cleanup: 1 },
            cleanupSucceeded: true,
          },
        };
        if (params.onComplete) {
          yield* params.onComplete(build);
        }
        if (mode === "interrupted") {
          yield* Effect.gen(function* () {
            yield* Deferred.succeed(sandboxStarted, undefined);
            yield* Effect.never;
          }).pipe(
            Effect.ensuring(
              Effect.sync(() => {
                sandboxStopped = true;
              })
            )
          );
        }
        if (mode === "sandbox") {
          return yield* Effect.fail(
            new Error("sandbox failed synthetic-box-secret")
          );
        }
        return build;
      }),
  }));
  const publish = {
    publishDeploymentFiles: async () => {
      if (mode === "publish") {
        throw new Error("publish failed");
      }
      return { files: [{}], totalBytes: 1 };
    },
  };
  mock.module("../src/publish", () => ({
    ...publish,
    publishDeploymentFilesEffect: (
      ...args: Parameters<typeof publish.publishDeploymentFiles>
    ) =>
      Effect.tryPromise({
        try: () => publish.publishDeploymentFiles(...args),
        catch: (error) => error,
      }),
  }));
  mock.module("../src/activation", () => ({
    activateDeployment: async () => {
      notifyActivation();
      if (holdActivation) {
        await activationReleased;
      }
      activationFinished = true;
      return "live";
    },
  }));
  mock.module("../src/reporting", () => ({
    openCheckRun: async (_site: Site, current: SiteDeployment) => current,
    reportOutcome: async () => {},
  }));
  const { runDeploymentPipeline, runDeploymentPipelineEffect } =
    await import("../src/pipeline");
  beforeEach(() => {
    saved.length = 0;
    r2Logs.length = 0;
    r2Fails = false;
    persistenceFails = false;
    finalPersistenceFails = false;
    r2Defects = false;
    sandboxStopped = false;
    sandboxStarted = Deferred.makeUnsafe<void>();
    holdActivation = false;
    activationFinished = false;
    activationStarted = new Promise<void>((resolve) => {
      notifyActivation = resolve;
    });
    activationReleased = new Promise<void>((resolve) => {
      releaseActivation = resolve;
    });
    mode = "success";
    deployment = {
      id: "deployment",
      siteId: "site",
      status: "queued",
      trigger: "manual",
      kind: "production",
      commitSha: "sha",
      branch: "main",
      startedAt: null,
      target: {
        publicOrigin: "https://example.test",
        mounts: {},
        noindex: false,
      },
    } as SiteDeployment;
  });
  test("final metrics include source, sandbox and publication while logs survive R2 failure", async () => {
    r2Fails = true;
    expect(await runDeploymentPipeline(site, deployment)).toEqual({
      kind: "live",
    });
    expect(saved.length).toBeGreaterThanOrEqual(2);
    const final = saved.at(-1);
    if (!final) {
      throw new Error("Final telemetry was not persisted");
    }
    expect(final.metrics.phases.sourceDownload).toBeGreaterThanOrEqual(0);
    expect(final.metrics.phases.compile).toBe(2);
    expect(final.metrics.phases.publish).toBeGreaterThanOrEqual(0);
    expect(final.metrics.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(final.log).toContain("[deployment:deploying]");
    expect(final.log).not.toContain("synthetic-github-secret");
  });
  test.each(["source", "sandbox", "publish"] as const)(
    "%s exceptions preserve partial metrics and redacted error logs",
    async (stage) => {
      mode = stage;
      await expect(runDeploymentPipeline(site, deployment)).rejects.toThrow(
        `${stage} failed`
      );
      const final = saved.at(-1);
      if (!final) {
        throw new Error("Failure telemetry was not persisted");
      }
      expect(final.metrics.phases.sourceDownload).toBeGreaterThanOrEqual(0);
      expect(final.log).toContain(`${stage} failed`);
      expect(final.log).not.toContain("synthetic-github-secret");
      expect(final.log).not.toContain("synthetic-box-secret");
      if (stage === "publish") {
        expect(final.metrics.phases.publish).toBeGreaterThanOrEqual(0);
      }
    }
  );
  test("compiler failure also stores metrics and logs", async () => {
    mode = "compiler";
    expect((await runDeploymentPipeline(site, deployment)).kind).toBe("failed");
    expect(saved.at(-1)?.metrics.phases.compile).toBe(2);
    expect(saved.at(-1)?.log).toContain("compiler output");
    expect(deployment.buildDurationMs).toBe(10);
  });
  test("repository access failures are retained before any sandbox starts", async () => {
    mode = "access";
    await expect(runDeploymentPipeline(site, deployment)).rejects.toThrow(
      "repository access failed"
    );
    const final = saved.at(-1);
    if (!final) {
      throw new Error("Access failure telemetry was not persisted");
    }
    expect(final.metrics.phases.repositoryAccess).toBeGreaterThanOrEqual(0);
    expect(final.metrics.phases.sandboxStartup).toBeUndefined();
    expect(final.metrics.sandboxId).toBeNull();
    expect(final.log).toContain("repository access failed");
    expect(final.log).not.toContain("synthetic-github-secret");
  });
  test("a persistence failure does not hide an earlier source failure", async () => {
    mode = "source";
    persistenceFails = true;
    await expect(runDeploymentPipeline(site, deployment)).rejects.toThrow(
      "source failed"
    );
    expect(r2Logs.at(-1)).toContain(
      "[telemetry:persistence] telemetry unavailable"
    );
    expect(r2Logs.at(-1)).not.toContain("synthetic-github-secret");
    expect(r2Logs.at(-1)).not.toContain("synthetic-box-secret");
  });
  test("a persistence failure is not reported as a successful build", async () => {
    persistenceFails = true;
    await expect(runDeploymentPipeline(site, deployment)).rejects.toThrow(
      "telemetry unavailable"
    );
    expect(deployment.status).not.toBe("ready");
  });
  test("final persistence failure rejects an otherwise completed publication", async () => {
    finalPersistenceFails = true;
    await expect(runDeploymentPipeline(site, deployment)).rejects.toThrow(
      "telemetry unavailable"
    );
    expect(deployment.status).toBe("ready");
    expect(saved).toHaveLength(1);
  });
  test("typed failures retain the original error object", async () => {
    mode = "source";
    persistenceFails = true;
    await expect(runDeploymentPipeline(site, deployment)).rejects.toBe(
      sourceFailure
    );
  });
  test("best-effort log IO does not swallow defects", async () => {
    r2Defects = true;
    await expect(runDeploymentPipeline(site, deployment)).rejects.toBe(
      logDefect
    );
    expect(deployment.status).toBe("building");
  });
  test("parent interruption waits for native sandbox cleanup and final telemetry", async () => {
    mode = "interrupted";
    await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(
          runDeploymentPipelineEffect(site, deployment)
        );
        yield* Deferred.await(sandboxStarted);
        yield* Fiber.interrupt(fiber);
        const result = yield* Fiber.await(fiber);
        expect(Exit.isFailure(result)).toBe(true);
      })
    );
    expect(sandboxStopped).toBe(true);
    expect(saved).toHaveLength(2);
    expect(saved.at(-1)?.metrics.phases.compile).toBe(2);
    expect(saved.at(-1)?.log).toContain("interrupted");
    expect(deployment.status).toBe("building");
  });
  test("activation cancellation waits for the authoritative Promise to settle", async () => {
    deployment.status = "ready";
    holdActivation = true;
    await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(
          runDeploymentPipelineEffect(site, deployment)
        );
        yield* Effect.promise(() => activationStarted);
        const interruption = yield* Effect.forkChild(Fiber.interrupt(fiber), {
          startImmediately: true,
        });
        expect(activationFinished).toBe(false);
        releaseActivation();
        yield* Fiber.join(interruption);
        expect(activationFinished).toBe(true);
        expect(Exit.isFailure(yield* Fiber.await(fiber))).toBe(true);
      })
    );
  });
}
