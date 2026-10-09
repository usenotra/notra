import { beforeEach, expect, mock, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { siteJobs } from "@notra/db/schema";
import { SITE_DEPLOYMENT_TRANSITIONS } from "@notra/sites-core/constants/sites";
import type { SiteBuildMetrics } from "@notra/sites-core/types/build-metrics";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { Deferred, Effect, Exit, Fiber } from "effect";

import type {
  SandboxBuildEffectParams,
  SandboxBuildResult,
} from "../src/types/build";
import type {
  DeploymentOutcome,
  SiteDeployment,
  SiteDeploymentStatus,
} from "../src/types/deployments";
import type { SiteJob } from "../src/types/jobs";
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
  let activationFails = false;
  let activationCalls = 0;
  let liveDeploymentId: string | null = null;
  let reportFails = false;
  const reported: DeploymentOutcome[] = [];
  const activationFailure = new Error("activation failed");
  const reportFailure = new Error("report failed");
  const telemetryFailure = new Error(
    "telemetry unavailable synthetic-github-secret Bearer synthetic-box-secret"
  );
  let job: SiteJob;
  let activationStarted = Promise.resolve();
  let notifyActivation: () => void = () => {};
  let activationReleased = Promise.resolve();
  let releaseActivation: () => void = () => {};
  const sourceFailure = new Error("source failed synthetic-github-secret");
  const logDefect = new Error("log adapter defect");
  const r2Logs: string[] = [];
  const saved: { metrics: SiteBuildMetrics; log: string }[] = [];
  const buildTargets: SandboxBuildEffectParams["target"][] = [];
  const telemetry = {
    saveBuildTelemetry: async (
      id: string,
      metrics: SiteBuildMetrics,
      log: string
    ) => {
      expect(id).toBe("deployment");
      if (persistenceFails || (finalPersistenceFails && saved.length > 0)) {
        throw telemetryFailure;
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
    cancelPreviewBuilds: () => {
      throw new Error("Unexpected preview cancellation");
    },
    enqueueSettingsDeployment: () => {
      throw new Error("Unexpected settings deployment");
    },
    getDeployment: async () => deployment,
    getSite: async () => site,
    hasNewerDeployment: async () => false,
    transitionDeployment: async (
      _id: string,
      status: SiteDeploymentStatus,
      values: object = {}
    ) => {
      if (!SITE_DEPLOYMENT_TRANSITIONS[status].includes(deployment.status)) {
        return false;
      }
      Object.assign(deployment, values, { status });
      return true;
    },
  }));
  mock.module("../src/state", () => ({
    reconcileProductionProjection: () => {
      throw new Error("Unexpected projection reconciliation");
    },
    removePreviewDeployment: () => {
      throw new Error("Unexpected preview removal");
    },
    syncServingAccess: () => {
      throw new Error("Unexpected preview access sync");
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
        buildTargets.push(params.target);
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
      activationCalls += 1;
      notifyActivation();
      if (holdActivation) {
        await activationReleased;
      }
      if (activationFails) {
        throw activationFailure;
      }
      liveDeploymentId = deployment.id;
      activationFinished = true;
      return "live";
    },
  }));
  mock.module("../src/reporting", () => ({
    openCheckRun: async (_site: Site, current: SiteDeployment) => current,
    reportOutcome: async (
      _site: Site,
      _deployment: SiteDeployment,
      outcome: DeploymentOutcome
    ) => {
      if (reportFails) {
        throw reportFailure;
      }
      reported.push(outcome);
    },
  }));
  const dialect = new PgDialect();
  const db = {
    select: (selection?: object) => ({
      from: (table: unknown) => {
        expect(table).toBe(siteJobs);
        const claimable =
          job.status === "pending" && job.attempts < job.maxAttempts;
        const rows = selection
          ? [{ total: 0, site: 0 }]
          : [job].filter(() => claimable);
        const query = {
          where: () => query,
          limit: async () => rows,
          then: (resolve: (rows: unknown[]) => unknown) =>
            Promise.resolve(rows).then(resolve),
        };
        return query;
      },
    }),
    update: (table: unknown) => ({
      set: (patch: Record<string, unknown>) => ({
        where: (where: SQL) => {
          expect(table).toBe(siteJobs);
          const query = dialect.sqlToQuery(where);
          expect(query.params[0]).toBe(job.id);
          const matches =
            !query.sql.includes('"attempts" =') ||
            (job.status === query.params[1] &&
              job.attempts === query.params[2]);
          if (matches) {
            const values = { ...patch };
            if (typeof values.attempts === "object") {
              values.attempts = job.attempts + 1;
              values.leaseUntil = new Date(Date.now() + 900_000);
            }
            Object.assign(job, values);
          }
          const rows = matches ? [{ ...job }] : [];
          return {
            returning: async () => rows,
            then: (resolve: (rows: unknown[]) => unknown) =>
              Promise.resolve(rows).then(resolve),
          };
        },
      }),
    }),
    transaction: async <A>(run: (tx: unknown) => Promise<A>): Promise<A> =>
      run({ ...db, execute: async () => {} }),
  };
  mock.module("@notra/db/drizzle", () => ({ db }));
  const { runDeploymentPipeline, runDeploymentPipelineEffect } =
    await import("../src/pipeline");
  const { runSiteJob } = await import("../src/runner");
  beforeEach(() => {
    saved.length = 0;
    buildTargets.length = 0;
    r2Logs.length = 0;
    r2Fails = false;
    persistenceFails = false;
    finalPersistenceFails = false;
    r2Defects = false;
    sandboxStopped = false;
    sandboxStarted = Deferred.makeUnsafe<void>();
    holdActivation = false;
    activationFinished = false;
    activationFails = false;
    activationCalls = 0;
    liveDeploymentId = null;
    reportFails = false;
    reported.length = 0;
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
    job = {
      id: "job",
      siteId: site.id,
      kind: "build",
      deploymentId: deployment.id,
      dedupeKey: null,
      payload: {},
      status: "pending",
      attempts: 2,
      maxAttempts: 3,
      availableAt: new Date(0),
      dispatchedAt: null,
      leaseUntil: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
  test.each(["production", "preview"] as const)(
    "%s builds only enable analytics for production",
    async (kind) => {
      deployment.kind = kind;
      expect(await runDeploymentPipeline(site, deployment)).toEqual({
        kind: "live",
      });
      expect(buildTargets).toHaveLength(1);
      expect(buildTargets[0]?.analytics).toBe(kind === "production");
    }
  );
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
  test("final persistence failure surfaces after activation and reporting", async () => {
    finalPersistenceFails = true;
    await expect(runDeploymentPipeline(site, deployment)).rejects.toBe(
      telemetryFailure
    );
    expect(deployment.status).toBe("ready");
    expect(saved).toHaveLength(1);
    expect(activationCalls).toBe(1);
    expect(liveDeploymentId).toBe(deployment.id);
    expect(reported).toEqual([{ kind: "live" }]);
    expect(r2Logs.at(-1)).toContain(
      "[telemetry:persistence] telemetry unavailable"
    );
    expect(r2Logs.at(-1)).not.toContain("synthetic-github-secret");
    expect(r2Logs.at(-1)).not.toContain("synthetic-box-secret");
  });
  test("last-attempt runner leaves the ready deployment live despite surfaced final telemetry failure", async () => {
    finalPersistenceFails = true;
    const errors = spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await runSiteJob(job.id)).toEqual({ status: "failed" });
    } finally {
      errors.mockRestore();
    }
    expect(job.attempts).toBe(job.maxAttempts);
    expect(job.status).toBe("failed");
    expect(job.lastError).toBe(telemetryFailure.message);
    expect(deployment.status).toBe("ready");
    expect(activationCalls).toBe(1);
    expect(liveDeploymentId).toBe(deployment.id);
    expect(reported).toEqual([{ kind: "live" }]);
  });
  test("native ready retry activates without rebuilding or carrying an old telemetry failure", async () => {
    finalPersistenceFails = true;
    await expect(runDeploymentPipeline(site, deployment)).rejects.toBe(
      telemetryFailure
    );
    expect(deployment.status).toBe("ready");
    expect(activationCalls).toBe(1);
    saved.length = 0;
    r2Logs.length = 0;
    reported.length = 0;
    persistenceFails = true;
    expect(
      await Effect.runPromise(runDeploymentPipelineEffect(site, deployment))
    ).toEqual({ kind: "live" });
    expect(activationCalls).toBe(2);
    expect(liveDeploymentId).toBe(deployment.id);
    expect(saved).toEqual([]);
    expect(r2Logs).toEqual([]);
    expect(reported).toEqual([{ kind: "live" }]);
  });
  test("activation failure wins over pending final telemetry failure", async () => {
    finalPersistenceFails = true;
    activationFails = true;
    await expect(runDeploymentPipeline(site, deployment)).rejects.toBe(
      activationFailure
    );
    expect(activationCalls).toBe(1);
    expect(liveDeploymentId).toBeNull();
    expect(reported).toEqual([]);
  });
  test("reporting failure wins over pending final telemetry failure", async () => {
    finalPersistenceFails = true;
    reportFails = true;
    await expect(runDeploymentPipeline(site, deployment)).rejects.toBe(
      reportFailure
    );
    expect(liveDeploymentId).toBe(deployment.id);
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
