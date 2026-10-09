import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { SiteGitTreeEntry } from "@notra/sites-core/types/smart-deployments";
import { Effect } from "effect";

import type { SandboxBuildEffectParams } from "../src/types/build";
import type {
  SiteDeployment,
  DeploymentOutcome,
} from "../src/types/deployments";
import type { R2PutOptions } from "../src/types/r2";
import type { Site } from "../src/types/sites";

const databaseUrl = process.env.SITES_TEST_DATABASE_URL;
if (!databaseUrl) {
  test.skip("Smart deployments integration requires synthetic PostgreSQL", () => {});
} else if (process.env.NOTRA_SMART_DEPLOYMENT_WORKER !== "1") {
  test("smart deployment pipeline with real PostgreSQL and serving-state CAS", () => {
    const url = new URL(databaseUrl);
    expect(url.hostname).toBe("127.0.0.1");
    expect(url.pathname).toBe("/notra_server_audit");
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          NOTRA_SMART_DEPLOYMENT_WORKER: "1",
          AI_GATEWAY_API_KEY: "",
          VERCEL_OIDC_TOKEN: "",
          VERCEL: "",
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
        },
        timeout: 60_000,
        encoding: "utf8",
      }
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
  }, 65_000);
} else {
  const { db } = await import("@notra/db/drizzle");
  const { organizations, sites, siteDeployments, siteJobs } =
    await import("@notra/db/schema");
  const { eq } = await import("drizzle-orm");
  const { SITE_R2_KEYS, SITE_BUILD_LIMITS } =
    await import("@notra/sites-core/constants/sites");
  const { R2PreconditionFailedError } = await import("../src/errors");
  const objects = new Map<string, { text: string; etag: string }>();
  let sourceFiles: SiteGitTreeEntry[] = [];
  let truncated = false;
  let treeFails = false;
  let treeCalls = 0;
  let branchHead = "a".repeat(40);
  let modelFails = false;
  let modelProbability = 0.05;
  let modelCalls = 0;
  let modelHook = async () => {};
  let reportHook = async () => {};
  let stateWriteHook = async () => {};
  let beforeStateWriteHook = async () => {};
  let buildCalls = 0;
  let buildHook = async () => {};
  let buildSucceeds = true;
  let downloadCalls = 0;
  let version = 0;
  let site: Site;
  let organizationId = "";
  const reported: DeploymentOutcome[] = [];
  const octokit = await import("@notra/ai/utils/octokit");
  mock.module("@notra/ai/utils/octokit", () => ({
    ...octokit,
    createOctokit: () => ({
      request: async () => {
        treeCalls++;
        if (treeFails) {
          throw new Error("Synthetic tree failure");
        }
        return { data: { tree: sourceFiles, truncated } };
      },
    }),
  }));
  mock.module("@notra/ai/evaluation/client", () => ({
    getEvaluationClient: () => ({
      tryEvaluate: async () => {
        modelCalls++;
        await modelHook();
        return modelFails
          ? null
          : {
              answers: {
                inputs_changed: {
                  type: "boolean",
                  probability: modelProbability,
                },
              },
              modelId: "typesafe-ai/jev",
            };
      },
    }),
  }));
  const r2 = await import("../src/r2");
  const read = async (key: string) => objects.get(key) ?? null;
  const write = async (
    key: string,
    body: string | Uint8Array,
    options?: R2PutOptions
  ) => {
    if (key === SITE_R2_KEYS.state(site.id)) {
      await beforeStateWriteHook();
    }
    const existing = objects.get(key);
    if (
      (options?.ifMatch && existing?.etag !== options.ifMatch) ||
      (options?.ifNoneMatch === "*" && existing)
    ) {
      throw new R2PreconditionFailedError("Synthetic CAS conflict");
    }
    const etag = String(++version);
    objects.set(key, {
      text: typeof body === "string" ? body : new TextDecoder().decode(body),
      etag,
    });
    if (key === SITE_R2_KEYS.state(site.id)) {
      await stateWriteHook();
    }
    return etag;
  };
  mock.module("../src/r2", () => ({
    ...r2,
    r2GetText: read,
    r2Put: write,
    r2GetTextEffect: (key: string) =>
      Effect.tryPromise({ try: () => read(key), catch: (error) => error }),
    r2PutEffect: (
      key: string,
      body: string | Uint8Array,
      options?: R2PutOptions
    ) =>
      Effect.tryPromise({
        try: () => write(key, body, options),
        catch: (error) => error,
      }),
  }));
  const github = await import("../src/github");
  mock.module("../src/github", () => ({
    ...github,
    siteRepositoryAccess: async () => ({
      repository: {
        organizationId,
        owner: "synthetic",
        repo: "docs",
        integrationId: null,
        githubRepositoryId: "1",
        installationId: "1",
      },
      token: "synthetic",
    }),
    getBranchHead: async () => ({ sha: branchHead }),
    downloadRepositoryTarballEffect: () =>
      Effect.sync(() => {
        downloadCalls++;
        return new Uint8Array([1]);
      }),
  }));
  mock.module("@notra/geo-core/ingest/sites", () => ({
    invalidateIngestSiteCaches: async () => {},
  }));
  mock.module("@notra/geo-core/geo/ingest", () => ({
    buildGeoIngestSiteToken: () => null,
  }));
  mock.module("../src/box-build", () => ({
    runSandboxBuildEffect: (params: SandboxBuildEffectParams) =>
      Effect.tryPromise({
        try: async () => {
          buildCalls++;
          await buildHook();
          return {
            result: {
              ok: buildSucceeds,
              diagnostics: buildSucceeds
                ? []
                : [
                    {
                      severity: "error" as const,
                      file: "blog/page.mdx",
                      code: "synthetic_failure",
                      message: "Synthetic compiler failure",
                    },
                  ],
              areas: [],
              fileCount: 1,
              totalBytes: 1,
              redirects: [],
              contentSecurityPolicy: null,
            },
            crash: null,
            log: "Synthetic sandbox",
            outputArchive: buildSucceeds ? new Uint8Array([1]) : null,
            toolchainVersion: "synthetic",
            durationMs: 1,
            metrics: {
              version: 1,
              provider: "upstash",
              snapshotId: params.snapshotId ?? "snapshot-1",
              sandboxId: "synthetic",
              requestedSize: "medium",
              sourceArchiveBytes: 1,
              outputArchiveBytes: 1,
              totalDurationMs: 1,
              phases: {},
            },
          };
        },
        catch: (error) => error,
      }),
  }));
  mock.module("../src/publish", () => ({
    publishDeploymentFilesEffect: ({
      deployment,
    }: {
      deployment: SiteDeployment;
    }) =>
      Effect.sync(() => {
        objects.set(SITE_R2_KEYS.manifest(site.id, deployment.id), {
          text: "{}",
          etag: String(++version),
        });
        return { files: [{}], totalBytes: 1 };
      }),
  }));
  mock.module("../src/reporting", () => ({
    openCheckRun: async (_site: Site, deployment: SiteDeployment) => deployment,
    reportOutcome: async (
      _site: Site,
      _deployment: SiteDeployment,
      outcome: DeploymentOutcome
    ) => {
      reported.push(outcome);
      await reportHook();
    },
  }));
  const {
    enqueueSiteDeployment,
    getDeployment,
    startDeploymentBuild,
    transitionDeployment,
  } = await import("../src/deployments");
  const { runDeploymentPipeline } = await import("../src/pipeline");
  const { readServingState, mutateServingState } = await import("../src/state");
  const { activateDeployment } = await import("../src/activation");
  const { updateSiteSettings } = await import("../src/sites");
  const { runSiteJob } = await import("../src/runner");
  const { claimSiteJob } = await import("../src/jobs");
  const queue = async (
    trigger: SiteDeployment["trigger"] = "push",
    previewKey: string | null = null
  ) =>
    (
      await enqueueSiteDeployment({
        siteId: site.id,
        kind: previewKey ? "preview" : "production",
        previewKey,
        trigger,
        branch: "main",
        commitSha: "a".repeat(40),
      })
    ).deployment;
  const publish = async (
    trigger: SiteDeployment["trigger"] = "manual",
    previewKey: string | null = null
  ) => {
    const deployment = await queue(trigger, previewKey);
    expect((await runDeploymentPipeline(site, deployment)).kind).toBe("live");
    return deployment;
  };
  beforeEach(async () => {
    organizationId = crypto.randomUUID();
    process.env.SITES_HOSTING_DOMAIN = "notra.site";
    process.env.SITES_BUILDER_SNAPSHOT_ID = "snapshot-1";
    await db.insert(organizations).values({
      id: organizationId,
      name: "Synthetic smart deployments",
      slug: organizationId,
      createdAt: new Date(),
    });
    const [created] = await db
      .insert(sites)
      .values({
        id: crypto.randomUUID(),
        organizationId,
        name: "Synthetic",
        slug: crypto.randomUUID(),
        publicOrigin: "https://synthetic.notra.site",
        mounts: { blog: "/blog" },
        githubRepositoryId: "1",
      })
      .returning();
    if (!created) {
      throw new Error("Synthetic site was not created");
    }
    site = created;
    sourceFiles = [
      {
        path: "blog/page.mdx",
        sha: "b".repeat(40),
        type: "blob",
        mode: "100644",
        size: 10,
      },
    ];
    truncated = false;
    treeFails = false;
    treeCalls = 0;
    branchHead = "a".repeat(40);
    modelFails = false;
    modelProbability = 0.05;
    modelCalls = 0;
    buildCalls = 0;
    buildHook = async () => {};
    buildSucceeds = true;
    downloadCalls = 0;
    modelHook = async () => {};
    reportHook = async () => {};
    stateWriteHook = async () => {};
    beforeStateWriteHook = async () => {};
    reported.length = 0;
    objects.clear();
  });
  afterEach(async () => {
    await db.delete(organizations).where(eq(organizations.id, organizationId));
  });
  afterAll(async () => {
    await Reflect.get(db, "$client").end();
  });

  test("default-on setting skips unchanged inputs without downloads or a sandbox and preserves live files", async () => {
    expect(site.smartDeployments).toBe(true);
    const baseline = await publish();
    const candidate = await queue();
    expect((await runDeploymentPipeline(site, candidate)).kind).toBe("skipped");
    expect(buildCalls).toBe(1);
    expect(downloadCalls).toBe(1);
    expect(modelCalls).toBe(1);
    const saved = await getDeployment(candidate.id);
    expect(saved?.status).toBe("skipped");
    expect(saved?.startedAt).toBeNull();
    expect(saved?.skipReason).toContain("unchanged");
    expect(saved?.smartDeploymentEvaluation?.changeProbability).toBe(0.05);
    const state = await readServingState(site.id);
    expect(state?.state.production?.deploymentId).toBe(baseline.id);
    expect(state?.state.production?.generation).toBe(candidate.generation);
    const next = await queue();
    expect((await runDeploymentPipeline(site, next)).kind).toBe("skipped");
    expect(buildCalls).toBe(1);
  });
  test("first deployment builds and establishes a fingerprint", async () => {
    const first = await publish("push");
    expect((await getDeployment(first.id))?.inputFingerprint).toBeTruthy();
    expect(modelCalls).toBe(0);
  });
  test.each(["moved-head", "newer-deployment"])(
    "%s is rejected before tree and model calls",
    async (mode) => {
      await publish();
      const candidate = await queue();
      if (mode === "moved-head") {
        branchHead = "c".repeat(40);
      } else {
        await queue();
      }
      treeCalls = 0;
      expect((await runDeploymentPipeline(site, candidate)).kind).toBe(
        "skipped"
      );
      expect((await getDeployment(candidate.id))?.status).toBe("superseded");
      expect(treeCalls).toBe(0);
      expect(modelCalls).toBe(0);
      expect(downloadCalls).toBe(1);
      expect(buildCalls).toBe(1);
    }
  );
  test("a head change during comparison is rechecked before skipping", async () => {
    await publish();
    const candidate = await queue();
    modelHook = async () => {
      branchHead = "c".repeat(40);
    };
    expect((await runDeploymentPipeline(site, candidate)).kind).toBe("skipped");
    expect((await getDeployment(candidate.id))?.status).toBe("superseded");
    expect(
      (await readServingState(site.id))?.state.production?.generation
    ).toBe(candidate.generation - 1);
    expect(modelCalls).toBe(1);
    expect(buildCalls).toBe(1);
  });
  test.each(["manual", "redeploy", "config"] as const)(
    "%s always builds identical inputs",
    async (trigger) => {
      await publish();
      await publish(trigger);
      expect(buildCalls).toBe(2);
    }
  );
  test("changed bytes build even when Jev predicts unchanged", async () => {
    await publish();
    sourceFiles[0] = { ...sourceFiles[0], sha: "c".repeat(40) };
    await publish("push");
    expect(buildCalls).toBe(2);
    expect(modelCalls).toBe(1);
  });
  test.each(["moved-head", "removed-head", "newer-deployment"])(
    "%s during compilation prevents publication",
    async (mode) => {
      const baseline = await publish();
      sourceFiles[0] = { ...sourceFiles[0], sha: "c".repeat(40) };
      const candidate = await queue();
      buildHook = async () => {
        if (mode === "newer-deployment") {
          await queue();
        } else {
          branchHead = mode === "removed-head" ? "" : "d".repeat(40);
        }
      };
      expect((await runDeploymentPipeline(site, candidate)).kind).toBe(
        "skipped"
      );
      expect((await getDeployment(candidate.id))?.status).toBe("superseded");
      expect(objects.has(SITE_R2_KEYS.manifest(site.id, candidate.id))).toBe(
        false
      );
      expect(
        (await readServingState(site.id))?.state.production?.deploymentId
      ).toBe(baseline.id);
      expect(buildCalls).toBe(2);
    }
  );
  test("a preview head move during compilation preserves the previous preview", async () => {
    const baseline = await publish("manual", "pr-1");
    sourceFiles[0] = { ...sourceFiles[0], sha: "c".repeat(40) };
    const candidate = await queue("pull_request", "pr-1");
    buildHook = async () => {
      branchHead = "d".repeat(40);
    };
    expect((await runDeploymentPipeline(site, candidate)).kind).toBe("skipped");
    expect((await getDeployment(candidate.id))?.status).toBe("superseded");
    expect(objects.has(SITE_R2_KEYS.manifest(site.id, candidate.id))).toBe(
      false
    );
    expect(
      (await readServingState(site.id))?.state.previews["pr-1"]?.deploymentId
    ).toBe(baseline.id);
  });
  test("a resumed build checks branch freshness before starting another sandbox", async () => {
    const baseline = await publish();
    const candidate = await queue();
    expect(await startDeploymentBuild(candidate, new Date())).toBe(true);
    const building = await getDeployment(candidate.id);
    if (!building) {
      throw new Error("Synthetic building deployment not found");
    }
    branchHead = "d".repeat(40);
    expect((await runDeploymentPipeline(site, building)).kind).toBe("skipped");
    expect((await getDeployment(candidate.id))?.status).toBe("superseded");
    expect(buildCalls).toBe(1);
    expect(
      (await readServingState(site.id))?.state.production?.deploymentId
    ).toBe(baseline.id);
  });
  test("a manual deployment still publishes its chosen commit when the branch moves during compilation", async () => {
    buildHook = async () => {
      branchHead = "d".repeat(40);
    };
    await publish("manual");
    expect(buildCalls).toBe(1);
  });
  test("a concurrent failed transition preserves the failed reporting outcome", async () => {
    await publish();
    sourceFiles[0] = { ...sourceFiles[0], sha: "c".repeat(40) };
    const candidate = await queue();
    const diagnostics = [
      {
        severity: "error" as const,
        file: null,
        code: "synthetic_failure",
        message: "Synthetic compiler failure",
      },
    ];
    modelHook = async () => {
      await transitionDeployment(candidate.id, "failed", {
        errorMessage: "Synthetic compiler failure",
        diagnostics,
        finishedAt: new Date(),
      });
    };
    expect(await runDeploymentPipeline(site, candidate)).toEqual({
      kind: "failed",
      summary: "Synthetic compiler failure",
      diagnostics,
    });
    expect(reported.at(-1)?.kind).toBe("failed");
    expect(buildCalls).toBe(1);
  });
  test("compiler failure retains the Jev shadow evaluation without a usable fingerprint", async () => {
    const baseline = await publish();
    sourceFiles[0] = { ...sourceFiles[0], sha: "c".repeat(40) };
    modelProbability = 0.96;
    buildSucceeds = false;
    const candidate = await queue();
    expect((await runDeploymentPipeline(site, candidate)).kind).toBe("failed");
    const saved = await getDeployment(candidate.id);
    expect(saved?.smartDeploymentEvaluation).toMatchObject({
      modelId: "typesafe-ai/jev",
      inputsChanged: true,
      changeProbability: 0.96,
    });
    expect(saved?.inputFingerprint).toBeNull();
    expect(
      (await readServingState(site.id))?.state.production?.deploymentId
    ).toBe(baseline.id);
  });
  test("Jev failure or disagreement does not override verified equality", async () => {
    await publish();
    modelFails = true;
    expect((await runDeploymentPipeline(site, await queue())).kind).toBe(
      "skipped"
    );
    modelFails = false;
    modelProbability = 0.99;
    expect((await runDeploymentPipeline(site, await queue())).kind).toBe(
      "skipped"
    );
    expect(buildCalls).toBe(1);
  });
  test.each(["tree-error", "truncated", "no-fingerprint"])(
    "%s builds conservatively",
    async (mode) => {
      const baseline = await publish();
      if (mode === "tree-error") {
        treeFails = true;
      }
      if (mode === "truncated") {
        truncated = true;
      }
      if (mode === "no-fingerprint") {
        await db
          .update(siteDeployments)
          .set({ inputFingerprint: null })
          .where(eq(siteDeployments.id, baseline.id));
      }
      await publish("push");
      expect(buildCalls).toBe(2);
    }
  );
  test("disabling the setting saves without rebuild and automatic pushes build", async () => {
    await publish();
    const result = await updateSiteSettings(
      site,
      { smartDeployments: false },
      null
    );
    expect(result.rebuilding).toBe(false);
    site = result.site;
    await publish("push");
    expect(buildCalls).toBe(2);
    expect(modelCalls).toBe(0);
  });
  test("setting disabled during evaluation prevents a skip", async () => {
    await publish();
    modelHook = async () => {
      await db
        .update(sites)
        .set({ smartDeployments: false })
        .where(eq(sites.id, site.id));
    };
    await publish("push");
    expect(buildCalls).toBe(2);
  });
  test.each(["production", "preview"] as const)(
    "%s canceled during comparison reaches a terminal state without a build",
    async (kind) => {
      const previewKey = kind === "preview" ? "pr-1" : null;
      await publish("manual", previewKey);
      const candidate = await queue("push", previewKey);
      modelHook = async () => {
        await db
          .update(sites)
          .set(
            kind === "preview"
              ? { previewsEnabled: false }
              : { status: "suspended" }
          )
          .where(eq(sites.id, site.id));
      };
      const outcome = await runDeploymentPipeline(site, candidate);
      expect(outcome.kind).toBe("skipped");
      const saved = await getDeployment(candidate.id);
      expect(saved?.status).toBe("canceled");
      expect(saved?.finishedAt).toBeInstanceOf(Date);
      expect(saved?.startedAt).toBeNull();
      expect(saved?.errorMessage).toBeTruthy();
      expect(buildCalls).toBe(1);
      expect(downloadCalls).toBe(1);
    }
  );
  test("a skipped job retries finalization after a transient failure without rebuilding", async () => {
    await publish();
    const candidate = await queue();
    const [job] = await db
      .select()
      .from(siteJobs)
      .where(eq(siteJobs.deploymentId, candidate.id));
    if (!job) {
      throw new Error("Missing build job");
    }
    reportHook = async () => {
      throw new Error("Synthetic reporting failure");
    };
    expect((await runSiteJob(job.id)).status).toBe("retrying");
    expect((await getDeployment(candidate.id))?.status).toBe("skipped");
    reportHook = async () => {};
    await db
      .update(siteJobs)
      .set({ availableAt: new Date(0) })
      .where(eq(siteJobs.id, job.id));
    await db.insert(siteJobs).values(
      Array.from({ length: SITE_BUILD_LIMITS.maxConcurrentBuilds }, () => ({
        id: crypto.randomUUID(),
        siteId: site.id,
        kind: "build" as const,
        status: "running" as const,
        leaseUntil: new Date(Date.now() + 60_000),
      }))
    );
    expect(await runSiteJob(job.id)).toEqual({
      status: "done",
      outcome: "skipped",
    });
    expect(reported).toHaveLength(3);
    expect(modelCalls).toBe(1);
    expect(buildCalls).toBe(1);
  });
  test("a running skipped finalization does not consume capacity for another build", async () => {
    await publish();
    await db.insert(siteJobs).values({
      id: crypto.randomUUID(),
      siteId: site.id,
      kind: "build",
      status: "running",
      leaseUntil: new Date(Date.now() + 60_000),
    });
    const candidate = await queue();
    const [candidateJob] = await db
      .select()
      .from(siteJobs)
      .where(eq(siteJobs.deploymentId, candidate.id));
    if (!candidateJob) {
      throw new Error("Missing candidate job");
    }
    let claimed = false;
    reportHook = async () => {
      const next = await queue();
      const [nextJob] = await db
        .select()
        .from(siteJobs)
        .where(eq(siteJobs.deploymentId, next.id));
      if (!nextJob) {
        throw new Error("Missing next build job");
      }
      claimed = (await claimSiteJob(nextJob.id))?.status === "running";
    };
    expect(await runSiteJob(candidateJob.id)).toEqual({
      status: "done",
      outcome: "skipped",
    });
    expect(claimed).toBe(true);
    expect(buildCalls).toBe(1);
  });
  test("a rollback during evaluation invalidates the live baseline even for the same deployment ID", async () => {
    const baseline = await publish();
    const candidate = await queue();
    modelHook = async () => {
      await mutateServingState(site, (state) => ({
        write: {
          ...state,
          production: {
            deploymentId: baseline.id,
            generation: candidate.generation + 1,
            activatedAt: new Date().toISOString(),
          },
        },
        result: undefined,
      }));
    };
    expect((await runDeploymentPipeline(site, candidate)).kind).toBe(
      "not_live"
    );
    expect((await getDeployment(candidate.id))?.status).toBe("ready");
    expect(buildCalls).toBe(2);
  });
  test("preview baselines are scoped to each preview", async () => {
    await publish();
    await publish("pull_request", "pr-1");
    expect(buildCalls).toBe(2);
    expect(
      (await runDeploymentPipeline(site, await queue("pull_request", "pr-1")))
        .kind
    ).toBe("skipped");
    await publish("pull_request", "pr-2");
    expect(buildCalls).toBe(3);
  });
  test("an expired preview builds instead of skipping against an unavailable version", async () => {
    await publish("pull_request", "pr-1");
    await mutateServingState(site, (state) => {
      const preview = state.previews["pr-1"];
      if (!preview) {
        throw new Error("Missing synthetic preview");
      }
      return {
        write: {
          ...state,
          previews: {
            ...state.previews,
            "pr-1": { ...preview, expiresAt: new Date(0).toISOString() },
          },
        },
        result: undefined,
      };
    });
    await publish("pull_request", "pr-1");
    expect(buildCalls).toBe(2);
    expect(modelCalls).toBe(0);
  });
  test("a CAS conflict rechecks the live generation before deciding to skip", async () => {
    const baseline = await publish();
    const candidate = await queue();
    beforeStateWriteHook = async () => {
      beforeStateWriteHook = async () => {};
      const key = SITE_R2_KEYS.state(site.id);
      const object = objects.get(key);
      if (!object) {
        throw new Error("Missing synthetic serving state");
      }
      const state = JSON.parse(object.text);
      state.production.generation = candidate.generation + 1;
      objects.set(key, {
        text: JSON.stringify(state),
        etag: String(++version),
      });
    };
    expect((await runDeploymentPipeline(site, candidate)).kind).toBe(
      "not_live"
    );
    expect((await getDeployment(candidate.id))?.status).toBe("ready");
    const live = (await readServingState(site.id))?.state.production;
    expect(live?.deploymentId).toBe(baseline.id);
    expect(live?.generation).toBe(candidate.generation + 1);
    expect(buildCalls).toBe(2);
  });
  test("snapshot and configuration changes force builds", async () => {
    await publish();
    process.env.SITES_BUILDER_SNAPSHOT_ID = "snapshot-2";
    await publish("push");
    const result = await updateSiteSettings(
      site,
      { showBranding: false },
      null
    );
    site = result.site;
    await publish("push");
    expect(buildCalls).toBe(3);
  });
  test("an older ready build cannot replace files after an unchanged push is skipped", async () => {
    const baseline = await publish();
    const older = await queue();
    await db
      .update(siteDeployments)
      .set({ status: "ready" })
      .where(eq(siteDeployments.id, older.id));
    objects.set(SITE_R2_KEYS.manifest(site.id, older.id), {
      text: "{}",
      etag: String(++version),
    });
    const candidate = await queue();
    expect((await runDeploymentPipeline(site, candidate)).kind).toBe("skipped");
    expect(await activateDeployment(site, older)).toBe("not_live");
    expect(
      (await readServingState(site.id))?.state.production?.deploymentId
    ).toBe(baseline.id);
    const skipped = await getDeployment(candidate.id);
    if (!skipped) {
      throw new Error("Missing skipped deployment");
    }
    expect((await runDeploymentPipeline(site, skipped)).kind).toBe("skipped");
    expect(buildCalls).toBe(1);
  });
  test("unchanged automatic pushes skip at quota; changed inputs cannot start a build", async () => {
    const baseline = await publish();
    const saved = await getDeployment(baseline.id);
    if (!saved) {
      throw new Error("Missing synthetic baseline");
    }
    await db.insert(siteDeployments).values(
      Array.from({ length: 299 }, (_, index) => ({
        id: crypto.randomUUID(),
        siteId: site.id,
        organizationId,
        kind: "production" as const,
        trigger: "manual" as const,
        status: "failed" as const,
        generation: index + 1000,
        branch: "main",
        commitSha: "old",
        target: saved.target,
        configHash: saved.configHash,
        startedAt: new Date(),
      }))
    );
    // Higher historical generations must not supersede the current branch head.
    expect((await runDeploymentPipeline(site, await queue())).kind).toBe(
      "skipped"
    );
    sourceFiles[0] = { ...sourceFiles[0], sha: "d".repeat(40) };
    const changed = await queue();
    await expect(startDeploymentBuild(changed, new Date())).rejects.toThrow(
      "reached 300 deployments"
    );
    expect((await getDeployment(changed.id))?.startedAt).toBeNull();
    expect(buildCalls).toBe(1);
  });
  test("a retry completes a skip after its serving fence was written", async () => {
    const baseline = await publish();
    const candidate = await queue();
    await mutateServingState(site, (state) => ({
      write: {
        ...state,
        production: {
          deploymentId: baseline.id,
          generation: candidate.generation,
          activatedAt: new Date().toISOString(),
        },
      },
      result: undefined,
    }));
    expect((await runDeploymentPipeline(site, candidate)).kind).toBe("skipped");
    expect((await getDeployment(candidate.id))?.status).toBe("skipped");
    expect(buildCalls).toBe(1);
  });
  test("an ambiguous serving-state write retries without building or replacing live files", async () => {
    const baseline = await publish();
    const candidate = await queue();
    stateWriteHook = async () => {
      stateWriteHook = async () => {};
      throw new Error("Synthetic lost write acknowledgement");
    };
    await expect(runDeploymentPipeline(site, candidate)).rejects.toThrow(
      "Synthetic lost write acknowledgement"
    );
    expect((await getDeployment(candidate.id))?.status).toBe("queued");
    expect(
      (await readServingState(site.id))?.state.production?.generation
    ).toBe(candidate.generation);
    expect((await runDeploymentPipeline(site, candidate)).kind).toBe("skipped");
    expect((await getDeployment(candidate.id))?.status).toBe("skipped");
    expect(
      (await readServingState(site.id))?.state.production?.deploymentId
    ).toBe(baseline.id);
    expect(buildCalls).toBe(1);
    expect(downloadCalls).toBe(1);
  });
  test("concurrent smart builds share the last budget slot and retries do not reserve twice", async () => {
    const baseline = await publish();
    const saved = await getDeployment(baseline.id);
    if (!saved) {
      throw new Error("Missing baseline");
    }
    await db.insert(siteDeployments).values(
      Array.from({ length: 298 }, (_, index) => ({
        id: crypto.randomUUID(),
        siteId: site.id,
        organizationId,
        kind: "production" as const,
        trigger: "manual" as const,
        status: "failed" as const,
        generation: index + 1000,
        branch: "main",
        commitSha: "old",
        target: saved.target,
        configHash: saved.configHash,
        startedAt: new Date(),
      }))
    );
    const secondSiteId = crypto.randomUUID();
    await db.insert(sites).values({
      id: secondSiteId,
      organizationId,
      name: "Second synthetic",
      slug: crypto.randomUUID(),
      publicOrigin: "https://second.notra.site",
      mounts: site.mounts,
    });
    const first = await queue();
    const second = (
      await enqueueSiteDeployment({
        siteId: secondSiteId,
        kind: "production",
        previewKey: null,
        trigger: "push",
        branch: "main",
        commitSha: "a".repeat(40),
      })
    ).deployment;
    const candidates = [first, second];
    const results = await Promise.allSettled(
      candidates.map((candidate) => startDeploymentBuild(candidate, new Date()))
    );
    expect(
      results.filter((result) => result.status === "fulfilled" && result.value)
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected")
    ).toHaveLength(1);
    const index = results.findIndex(
      (result) => result.status === "fulfilled" && result.value
    );
    const accepted = candidates[index];
    if (!accepted) {
      throw new Error("No accepted build");
    }
    expect(await startDeploymentBuild(accepted, new Date())).toBe(true);
  });
}
