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
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.SITES_TEST_DATABASE_URL;
if (!databaseUrl) {
  test.skip("PostgreSQL lifecycle regressions require SITES_TEST_DATABASE_URL", () => {});
} else if (process.env.NOTRA_SITES_POSTGRES_TEST_WORKER !== "1") {
  test("real PostgreSQL advisory locks, capacity, generations and lease fencing", () => {
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
          NOTRA_SITES_POSTGRES_TEST_WORKER: "1",
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
        },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const { db } = await import("@notra/db/drizzle");
  const { organizations, sites, siteJobs, siteDeployments, users } =
    await import("@notra/db/schema");
  const { eq, inArray, sql } = await import("drizzle-orm");
  const { claimSiteJob, completeSiteJob, failSiteJob } =
    await import("../src/jobs");
  const {
    enqueuePreviewRemoval,
    enqueueSiteDeployment,
    cancelPreviewBuilds,
    getSite,
    listSiteDeployments,
    enqueueSettingsDeployment,
  } = await import("../src/deployments");
  const { withSiteStorageLock } =
    await import("../src/utils/site-storage-lock");
  let organizationId = "";
  let siteId = "";
  let userId = "";
  const objects = new Map<string, string>();
  let onStateWrite = async () => {};
  let onBranchHead = async () => {};
  let branchHeadCalls = 0;
  const github = await import("../src/github");
  mock.module("../src/github", () => ({
    ...github,
    siteRepositoryAccess: async () => ({ repository: {}, token: "synthetic" }),
    getBranchHead: async () => {
      branchHeadCalls += 1;
      await onBranchHead();
      return {
        sha: "b".repeat(40),
        message: "Synthetic commit",
        author: "Synthetic author",
      };
    },
  }));
  mock.module("../src/r2", () => ({
    r2GetText: async (key: string) =>
      objects.has(key)
        ? { text: objects.get(key), etag: "synthetic-etag" }
        : null,
    r2Put: async (key: string, text: string) => {
      await onStateWrite();
      objects.set(key, text);
      return "synthetic-etag";
    },
    r2DeleteKey: async (key: string) => {
      objects.delete(key);
    },
    r2DeleteKeyIfMatch: async (key: string, etag: string) => {
      expect(etag).toBe("synthetic-etag");
      objects.delete(key);
    },
    r2DeletePrefix: () => {
      throw new Error("Unexpected storage cleanup");
    },
    r2ListPrefixes: () => {
      throw new Error("Unexpected storage listing");
    },
  }));
  mock.module("@notra/geo-core/geo/ingest", () => ({
    buildGeoIngestSiteToken: () => null,
  }));
  const { activateDeployment } = await import("../src/activation");
  const { updateSiteSettings, setSitePublicOrigin } =
    await import("../src/sites");
  const { runSiteJob } = await import("../src/runner");
  const { SITE_R2_KEYS } = await import("@notra/sites-core/constants/sites");
  process.env.SITES_HOSTING_DOMAIN = "notra.site";

  beforeEach(async () => {
    objects.clear();
    onStateWrite = async () => {};
    onBranchHead = async () => {};
    branchHeadCalls = 0;
    organizationId = `sites-audit-${crypto.randomUUID()}`;
    siteId = `${organizationId}-site`;
    userId = `${organizationId}-admin`;
    await db.insert(users).values({
      id: userId,
      name: "Synthetic admin",
      email: `${userId}@example.test`,
    });
    await db.insert(organizations).values({
      id: organizationId,
      name: "Server audit",
      slug: organizationId,
      createdAt: new Date(),
    });
    await db.insert(sites).values({
      id: siteId,
      organizationId,
      name: "Server audit",
      slug: crypto.randomUUID().slice(0, 8),
      publicOrigin: "https://example.notra.site",
      mounts: { blog: "/blog" },
    });
  });
  afterEach(async () => {
    await db.delete(organizations).where(eq(organizations.id, organizationId));
    await db.delete(users).where(eq(users.id, userId));
  });
  afterAll(async () => {
    await Reflect.get(db, "$client").end();
  });

  test("30 simultaneous same-site claims permit exactly two running builds", async () => {
    const ids = Array.from(
      { length: 30 },
      (_, index) => `${siteId}-job-${index}`
    );
    await db
      .insert(siteJobs)
      .values(ids.map((id) => ({ id, siteId, kind: "build" as const })));
    const claimed = await Promise.all(ids.map(claimSiteJob));
    expect(claimed.filter(Boolean)).toHaveLength(2);
    const rows = await db
      .select()
      .from(siteJobs)
      .where(eq(siteJobs.siteId, siteId));
    expect(rows.filter((row) => row.status === "running")).toHaveLength(2);
    expect(rows.filter((row) => row.status === "pending")).toHaveLength(28);
  });

  test("deployment history retains referenced previews beyond its limit without duplicate or foreign rows", async () => {
    const foreignSiteId = `${siteId}-foreign`;
    await db.insert(sites).values({
      id: foreignSiteId,
      organizationId,
      name: "Foreign synthetic site",
      slug: crypto.randomUUID().slice(0, 8),
      publicOrigin: "https://foreign.notra.site",
      mounts: { blog: "/blog" },
    });
    const history = Array.from({ length: 7 }, (_, index) => ({
      id: `${siteId}-history-${index}`,
      siteId,
      organizationId,
      kind:
        index === 0 || index === 2
          ? ("preview" as const)
          : ("production" as const),
      previewKey: index === 0 || index === 2 ? `pr-${index}` : null,
      trigger: "manual" as const,
      status: "ready" as const,
      generation: index + 1,
      branch: "main",
      commitSha: "a".repeat(40),
      target: {
        publicOrigin: "https://example.notra.site",
        mounts: { blog: "/blog" },
        noindex: false,
        branding: true,
      },
      configHash: "synthetic",
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
    }));
    const oldest = history[0];
    if (!oldest) {
      throw new Error("Expected synthetic deployment history");
    }
    const foreignId = `${foreignSiteId}-deployment`;
    await db.insert(siteDeployments).values([
      ...history,
      {
        ...oldest,
        id: foreignId,
        siteId: foreignSiteId,
        createdAt: new Date(Date.UTC(2026, 0, 2)),
      },
    ]);
    const newestId = `${siteId}-history-6`;
    const olderPreviewId = `${siteId}-history-2`;
    const recentIds = [newestId, `${siteId}-history-5`, `${siteId}-history-4`];
    expect((await listSiteDeployments(siteId, 3)).map((row) => row.id)).toEqual(
      recentIds
    );
    const rows = await listSiteDeployments(siteId, 3, [
      oldest.id,
      oldest.id,
      newestId,
      newestId,
      foreignId,
      `${siteId}-missing`,
      olderPreviewId,
      olderPreviewId,
    ]);
    expect(rows.map((row) => row.id)).toEqual([
      ...recentIds,
      olderPreviewId,
      oldest.id,
    ]);
    expect(rows.filter((row) => row.id === newestId)).toHaveLength(1);
    expect(rows.filter((row) => row.id === oldest.id)).toHaveLength(1);
    expect(rows.filter((row) => row.id === olderPreviewId)).toHaveLength(1);
    expect(rows.every((row) => row.siteId === siteId)).toBe(true);
    expect(
      rows.filter((row) => row.kind === "preview").map((row) => row.id)
    ).toEqual([olderPreviewId, oldest.id]);
    expect(
      (
        await listSiteDeployments(siteId, 3, [foreignId, `${siteId}-missing`])
      ).map((row) => row.id)
    ).toEqual(recentIds);
  });

  test("30 simultaneous different-site claims permit exactly twenty globally", async () => {
    const ids = Array.from({ length: 30 }, (_, index) => `${siteId}-${index}`);
    await db.insert(sites).values(
      ids.map((id) => ({
        id,
        organizationId,
        name: "Server audit",
        slug: crypto.randomUUID().slice(0, 8),
        publicOrigin: "https://example.notra.site",
        mounts: { blog: "/blog" },
      }))
    );
    await db
      .insert(siteJobs)
      .values(ids.map((id) => ({ id, siteId: id, kind: "build" as const })));
    expect(
      (await Promise.all(ids.map(claimSiteJob))).filter(Boolean)
    ).toHaveLength(20);
  });

  test("parallel deployments across sites cannot exceed the organization's final daily slot", async () => {
    await db.insert(siteDeployments).values(
      Array.from({ length: 299 }, (_, index) => ({
        id: `${siteId}-previous-${index}`,
        siteId,
        organizationId,
        kind: "production" as const,
        trigger: "manual" as const,
        generation: index + 1,
        branch: "main",
        commitSha: "a".repeat(40),
        target: {
          publicOrigin: "https://example.notra.site",
          mounts: { blog: "/blog" },
          noindex: false,
          branding: true,
        },
        configHash: "synthetic",
      }))
    );
    const ids = Array.from(
      { length: 30 },
      (_, index) => `${siteId}-budget-${index}`
    );
    await db.insert(sites).values(
      ids.map((id) => ({
        id,
        organizationId,
        name: "Server audit",
        slug: crypto.randomUUID().slice(0, 8),
        publicOrigin: "https://example.notra.site",
        mounts: { blog: "/blog" },
      }))
    );
    const results = await Promise.allSettled(
      ids.map((id) =>
        enqueueSiteDeployment({
          siteId: id,
          kind: "production",
          previewKey: null,
          trigger: "manual",
          branch: "main",
          commitSha: "b".repeat(40),
        })
      )
    );
    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);
    const rejected = results.filter((result) => result.status === "rejected");
    expect(rejected).toHaveLength(29);
    for (const result of rejected) {
      expect(result.reason.message).toContain("reached 300 deployments");
    }
    expect(
      await db
        .select()
        .from(siteDeployments)
        .where(eq(siteDeployments.organizationId, organizationId))
    ).toHaveLength(300);
    expect(
      await db.select().from(siteJobs).where(inArray(siteJobs.siteId, ids))
    ).toHaveLength(1);
  });

  test("reclaimed jobs reject completion and failure from an expired attempt", async () => {
    const id = `${siteId}-job`;
    await db.insert(siteJobs).values({ id, siteId, kind: "build" });
    const first = await claimSiteJob(id);
    expect(first?.attempts).toBe(1);
    await db
      .update(siteJobs)
      .set({ leaseUntil: new Date(0) })
      .where(eq(siteJobs.id, id));
    const replacement = await claimSiteJob(id);
    expect(replacement?.attempts).toBe(2);
    if (!first || !replacement) {
      throw new Error("Expected both attempts to claim");
    }
    await completeSiteJob(first);
    expect(await failSiteJob(first, new Error("stale worker"), true)).toBe(
      "skipped"
    );
    expect(
      (await db.select().from(siteJobs).where(eq(siteJobs.id, id)))[0]?.status
    ).toBe("running");
    await completeSiteJob(replacement);
    expect(
      (await db.select().from(siteJobs).where(eq(siteJobs.id, id)))[0]?.status
    ).toBe("done");
  });

  test("preview close reserves its cutoff before a reopen queues a deployment", async () => {
    const removalId = await enqueuePreviewRemoval(siteId, "pr-1");
    const { deployment } = await enqueueSiteDeployment({
      siteId,
      kind: "preview",
      previewKey: "pr-1",
      trigger: "pull_request",
      branch: "feature",
      commitSha: "a".repeat(40),
    });
    const [removal] = await db
      .select()
      .from(siteJobs)
      .where(eq(siteJobs.id, removalId));
    expect(removal?.payload).toEqual({ previewKey: "pr-1", generation: 1 });
    expect(deployment.generation).toBe(2);
    await cancelPreviewBuilds(siteId, "pr-1", 1);
    expect(
      (
        await db
          .select()
          .from(siteDeployments)
          .where(eq(siteDeployments.id, deployment.id))
      )[0]?.status
    ).toBe("queued");
  });

  test("the global capacity check waits for the transaction lock", async () => {
    const id = `${siteId}-job`;
    await db.insert(siteJobs).values({ id, siteId, kind: "build" });
    let acquired = () => {};
    let release = () => {};
    const locked = new Promise<void>((resolve) => {
      acquired = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const holder = db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended('sites-build-capacity', 0))`
      );
      acquired();
      await gate;
    });
    await locked;
    let completed = false;
    const claim = claimSiteJob(id).then((job) => {
      completed = true;
      return job;
    });
    await delay(50);
    expect(completed).toBe(false);
    release();
    await holder;
    expect((await claim)?.id).toBe(id);
  });

  test("storage locks serialize the same site but do not block other sites", async () => {
    let acquired = () => {};
    let release = () => {};
    const locked = new Promise<void>((resolve) => {
      acquired = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const holder = withSiteStorageLock(siteId, async () => {
      acquired();
      await gate;
    });
    await locked;
    let entered = false;
    const sameSite = withSiteStorageLock(siteId, async () => {
      entered = true;
    });
    await withSiteStorageLock(`${siteId}-other`, async () => {});
    expect(entered).toBe(false);
    release();
    await Promise.all([holder, sameSite]);
    expect(entered).toBe(true);
  });

  test("activation rejects disabled previews using current PostgreSQL policy", async () => {
    const stale = await getSite(siteId);
    if (!stale) {
      throw new Error("Expected synthetic site");
    }
    const { deployment } = await enqueueSiteDeployment({
      siteId,
      kind: "preview",
      previewKey: "pr-1",
      trigger: "manual",
      branch: "feature",
      commitSha: "a".repeat(40),
    });
    objects.set(SITE_R2_KEYS.manifest(siteId, deployment.id), "{}");
    await db
      .update(sites)
      .set({ previewsEnabled: false })
      .where(eq(sites.id, siteId));
    expect(await activateDeployment(stale, deployment)).toBe("not_live");
    expect(objects.has(SITE_R2_KEYS.state(siteId))).toBe(false);
  });

  test("activation holds the site row lock through the serving-state write", async () => {
    const stale = await getSite(siteId);
    if (!stale) {
      throw new Error("Expected synthetic site");
    }
    const { deployment } = await enqueueSiteDeployment({
      siteId,
      kind: "preview",
      previewKey: "pr-1",
      trigger: "manual",
      branch: "feature",
      commitSha: "a".repeat(40),
    });
    objects.set(SITE_R2_KEYS.manifest(siteId, deployment.id), "{}");
    let started = () => {};
    let resume = () => {};
    const writing = new Promise<void>((resolve) => {
      started = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      resume = resolve;
    });
    onStateWrite = async () => {
      started();
      await gate;
    };
    const activation = activateDeployment(
      { ...stale, previewVisibility: "public" },
      deployment
    );
    await writing;
    let updated = false;
    const disable = updateSiteSettings(
      stale,
      { previewsEnabled: false },
      userId
    ).then((result) => {
      updated = true;
      return result;
    });
    await delay(50);
    try {
      expect(updated).toBe(false);
    } finally {
      resume();
    }
    expect(await activation).toBe("live");
    const disabled = await disable;
    expect(updated).toBe(true);
    expect(
      JSON.parse(objects.get(SITE_R2_KEYS.state(siteId)) ?? "{}").previews[
        "pr-1"
      ].visibility
    ).toBe("protected");
    expect((await getSite(siteId))?.previewsEnabled).toBe(false);
    const [intent] = await db
      .select()
      .from(siteJobs)
      .where(eq(siteJobs.id, disabled.syncJobId));
    expect(intent?.kind).toBe("sync_state");
    expect(intent?.payload).toMatchObject({
      removePreviewsThrough: deployment.generation + 1,
    });
    expect(await runSiteJob(disabled.syncJobId)).toEqual({
      status: "done",
    });
    expect(
      JSON.parse(objects.get(SITE_R2_KEYS.state(siteId)) ?? "{}").previews
    ).toEqual({});
  });

  test("settings persist password and visibility together with retryable intent before any R2 write", async () => {
    const original = await getSite(siteId);
    if (!original) {
      throw new Error("Expected synthetic site");
    }
    const first = await updateSiteSettings(
      original,
      {
        previewVisibility: "public",
        previewPassword: "synthetic-password",
      },
      userId
    );
    const saved = await getSite(siteId);
    expect(saved?.previewVisibility).toBe("public");
    expect(saved?.previewPassword?.hash).toBeTruthy();
    expect(objects.size).toBe(0);
    const [intent] = await db
      .select()
      .from(siteJobs)
      .where(eq(siteJobs.id, first.syncJobId));
    expect(intent?.kind).toBe("sync_state");
    expect(JSON.stringify(intent?.payload)).not.toContain("synthetic-password");
    onStateWrite = async () => {
      throw new Error("Synthetic R2 failure");
    };
    expect(await runSiteJob(first.syncJobId)).toEqual({ status: "retrying" });
    const identical = await updateSiteSettings(
      saved ?? original,
      {
        previewVisibility: "public",
        previewPassword: "synthetic-password",
      },
      userId
    );
    onStateWrite = async () => {};
    expect(await runSiteJob(identical.syncJobId)).toEqual({ status: "done" });
    const state = JSON.parse(objects.get(SITE_R2_KEYS.state(siteId)) ?? "{}");
    expect(state.previewPassword).toEqual(
      (await getSite(siteId))?.previewPassword
    );
    await db
      .update(siteJobs)
      .set({ availableAt: new Date(0) })
      .where(eq(siteJobs.id, first.syncJobId));
    expect(await runSiteJob(first.syncJobId)).toEqual({ status: "done" });
    expect(
      JSON.parse(objects.get(SITE_R2_KEYS.state(siteId)) ?? "{}")
        .previewPassword
    ).toEqual(state.previewPassword);
  });

  test("invalid coupled preview update changes neither settings nor jobs", async () => {
    const original = await getSite(siteId);
    if (!original) {
      throw new Error("Expected synthetic site");
    }
    await expect(
      updateSiteSettings(
        original,
        {
          previewVisibility: "public",
          previewsEnabled: false,
          rootDirectory: "changed",
          previewPassword: "short",
        },
        userId
      )
    ).rejects.toThrow("password needs");
    expect(await getSite(siteId)).toEqual(original);
    expect(
      await db.select().from(siteJobs).where(eq(siteJobs.siteId, siteId))
    ).toEqual([]);
    expect(objects.size).toBe(0);
  });

  test("intent insertion failure rolls back the coupled DB fields and reserved cutoff", async () => {
    const original = await getSite(siteId);
    if (!original) {
      throw new Error("Expected synthetic site");
    }
    const uuid = crypto.randomUUID();
    const collision = `job_${uuid.replaceAll("-", "")}`;
    await db
      .insert(siteJobs)
      .values({ id: collision, siteId, kind: "sync_state" });
    const randomId = spyOn(crypto, "randomUUID").mockReturnValue(uuid);
    try {
      await expect(
        updateSiteSettings(
          original,
          {
            previewVisibility: "public",
            previewsEnabled: false,
            previewPassword: "synthetic-password",
            rootDirectory: "changed",
          },
          userId
        )
      ).rejects.toThrow();
    } finally {
      randomId.mockRestore();
    }
    expect(await getSite(siteId)).toEqual(original);
    expect(
      await db.select().from(siteJobs).where(eq(siteJobs.siteId, siteId))
    ).toHaveLength(1);
    expect(objects.size).toBe(0);
  });

  test("saved rebuild intent survives deletion of its requesting user", async () => {
    const original = await getSite(siteId);
    if (!original) {
      throw new Error("Expected synthetic site");
    }
    const saved = await updateSiteSettings(
      original,
      { rootDirectory: "changed" },
      userId
    );
    await db.delete(users).where(eq(users.id, userId));
    expect(await runSiteJob(saved.syncJobId)).toEqual({ status: "done" });
    const [deployment] = await db
      .select()
      .from(siteDeployments)
      .where(eq(siteDeployments.siteId, siteId));
    expect(deployment?.requestedByUserId).toBeNull();
    expect(deployment?.commitSha).toBe("b".repeat(40));
  });

  test("failed mixed rebuild and disable closes previews first and identical save cannot lose the rebuild intent", async () => {
    const original = await getSite(siteId);
    if (!original) {
      throw new Error("Expected synthetic site");
    }
    const { deployment } = await enqueueSiteDeployment({
      siteId,
      kind: "preview",
      previewKey: "pr-1",
      trigger: "manual",
      branch: "feature",
      commitSha: "a".repeat(40),
    });
    objects.set(SITE_R2_KEYS.manifest(siteId, deployment.id), "{}");
    expect(await activateDeployment(original, deployment)).toBe("live");
    const first = await updateSiteSettings(
      original,
      { rootDirectory: "changed", previewsEnabled: false },
      userId
    );
    expect(first.rebuilding).toBe(true);
    onBranchHead = async () => {
      throw new Error("Synthetic GitHub failure");
    };
    expect(await runSiteJob(first.syncJobId)).toEqual({ status: "retrying" });
    expect(
      JSON.parse(objects.get(SITE_R2_KEYS.state(siteId)) ?? "{}").previews
    ).toEqual({});
    expect(
      (
        await db
          .select()
          .from(siteDeployments)
          .where(eq(siteDeployments.id, deployment.id))
      )[0]?.status
    ).toBe("canceled");
    const current = await getSite(siteId);
    if (!current) {
      throw new Error("Expected saved site");
    }
    const identical = await updateSiteSettings(
      current,
      { rootDirectory: "changed", previewsEnabled: false },
      userId
    );
    expect(identical.rebuilding).toBe(false);
    expect(await runSiteJob(identical.syncJobId)).toEqual({ status: "done" });
    onBranchHead = async () => {};
    await db
      .update(siteJobs)
      .set({ availableAt: new Date(0) })
      .where(eq(siteJobs.id, first.syncJobId));
    expect(await runSiteJob(first.syncJobId)).toEqual({ status: "done" });
    const builds = await db
      .select()
      .from(siteJobs)
      .where(eq(siteJobs.dedupeKey, `settings-build:${first.syncJobId}`));
    expect(builds).toHaveLength(1);
    const [rebuilt] = await db
      .select()
      .from(siteDeployments)
      .where(eq(siteDeployments.id, builds[0]?.deploymentId ?? ""));
    expect(rebuilt?.target.mounts).toEqual(current.mounts);
    expect(rebuilt?.commitSha).toBe("b".repeat(40));
  });

  test("delayed disable uses its saved cutoff without removing or canceling a newer reopen", async () => {
    const original = await getSite(siteId);
    if (!original) {
      throw new Error("Expected synthetic site");
    }
    const first = await enqueueSiteDeployment({
      siteId,
      kind: "preview",
      previewKey: "pr-1",
      trigger: "manual",
      branch: "feature",
      commitSha: "a".repeat(40),
    });
    const off = await updateSiteSettings(
      original,
      { previewsEnabled: false },
      userId
    );
    const on = await updateSiteSettings(
      off.site,
      { previewsEnabled: true, previewVisibility: "public" },
      userId
    );
    const reopened = await enqueueSiteDeployment({
      siteId,
      kind: "preview",
      previewKey: "pr-1",
      trigger: "manual",
      branch: "feature",
      commitSha: "b".repeat(40),
    });
    objects.set(SITE_R2_KEYS.manifest(siteId, reopened.deployment.id), "{}");
    expect(await activateDeployment(on.site, reopened.deployment)).toBe("live");
    expect(await runSiteJob(off.syncJobId)).toEqual({ status: "done" });
    const state = JSON.parse(objects.get(SITE_R2_KEYS.state(siteId)) ?? "{}");
    expect(state.previews["pr-1"].deploymentId).toBe(reopened.deployment.id);
    expect(state.previews["pr-1"].visibility).toBe("public");
    const deployments = await db
      .select()
      .from(siteDeployments)
      .where(eq(siteDeployments.siteId, siteId));
    expect(
      deployments.find((row) => row.id === first.deployment.id)?.status
    ).toBe("canceled");
    expect(
      deployments.find((row) => row.id === reopened.deployment.id)?.status
    ).toBe("queued");
  });

  test("settings rebuild enqueue dedupes its real job ID and rejects a reclaimed attempt", async () => {
    const original = await getSite(siteId);
    if (!original) {
      throw new Error("Expected synthetic site");
    }
    const saved = await updateSiteSettings(
      original,
      { rootDirectory: "changed" },
      userId
    );
    const first = await claimSiteJob(saved.syncJobId);
    if (!first) {
      throw new Error("Expected settings claim");
    }
    const input = {
      siteId,
      kind: "production" as const,
      previewKey: null,
      trigger: "config" as const,
      branch: "main",
      commitSha: "b".repeat(40),
    };
    const queued = await Promise.all([
      enqueueSettingsDeployment(input, first),
      enqueueSettingsDeployment(input, first),
    ]);
    expect(queued[0]).toBeTruthy();
    expect(queued[1]).toBe(queued[0]);
    expect(
      await db
        .select()
        .from(siteDeployments)
        .where(eq(siteDeployments.siteId, siteId))
    ).toHaveLength(1);
    await db
      .update(siteJobs)
      .set({ leaseUntil: new Date(0) })
      .where(eq(siteJobs.id, first.id));
    const reclaimed = await claimSiteJob(first.id);
    expect(reclaimed?.attempts).toBe(first.attempts + 1);
    expect(await enqueueSettingsDeployment(input, first)).toBeNull();
    await completeSiteJob(first);
    expect(
      (await db.select().from(siteJobs).where(eq(siteJobs.id, first.id)))[0]
        ?.status
    ).toBe("running");
    if (!reclaimed) {
      throw new Error("Expected reclaimed settings job");
    }
    expect(
      await failSiteJob(
        reclaimed,
        new Error("Synthetic post-enqueue failure"),
        false
      )
    ).toBe("retrying");
    onBranchHead = async () => {
      throw new Error("Must not resolve an already queued rebuild");
    };
    await db
      .update(siteJobs)
      .set({ availableAt: new Date(0) })
      .where(eq(siteJobs.id, first.id));
    expect(await runSiteJob(first.id)).toEqual({ status: "done" });
    expect(branchHeadCalls).toBe(0);
    expect(
      await db
        .select()
        .from(siteDeployments)
        .where(eq(siteDeployments.siteId, siteId))
    ).toHaveLength(1);
  });

  test("settings intent remains dispatchable after the normal build retry budget", async () => {
    const original = await getSite(siteId);
    if (!original) {
      throw new Error("Expected synthetic site");
    }
    const saved = await updateSiteSettings(
      original,
      { previewVisibility: "public" },
      userId
    );
    await db
      .update(siteJobs)
      .set({ attempts: 3, maxAttempts: 3 })
      .where(eq(siteJobs.id, saved.syncJobId));
    onStateWrite = async () => {
      throw new Error("Synthetic prolonged R2 failure");
    };
    expect(await runSiteJob(saved.syncJobId)).toEqual({ status: "retrying" });
    const { listDispatchableSiteJobs, takeExhaustedSiteJobs } =
      await import("../src/jobs");
    await db
      .update(siteJobs)
      .set({ availableAt: new Date(0) })
      .where(eq(siteJobs.id, saved.syncJobId));
    expect(
      (await listDispatchableSiteJobs()).some(
        (job) => job.id === saved.syncJobId
      )
    ).toBe(true);
    const claimed = await claimSiteJob(saved.syncJobId);
    expect(claimed).toBeTruthy();
    await db
      .update(siteJobs)
      .set({ leaseUntil: new Date(0) })
      .where(eq(siteJobs.id, saved.syncJobId));
    expect(
      (await takeExhaustedSiteJobs()).some((job) => job.id === saved.syncJobId)
    ).toBe(false);
    onStateWrite = async () => {};
    expect(await runSiteJob(saved.syncJobId)).toEqual({ status: "done" });
  });

  test("a settings lease expiring during branch resolution cannot complete an unenqueued rebuild", async () => {
    const original = await getSite(siteId);
    if (!original) {
      throw new Error("Expected synthetic site");
    }
    const saved = await updateSiteSettings(
      original,
      { rootDirectory: "changed" },
      userId
    );
    onBranchHead = async () => {
      await db
        .update(siteJobs)
        .set({ leaseUntil: new Date(0) })
        .where(eq(siteJobs.id, saved.syncJobId));
    };
    expect(await runSiteJob(saved.syncJobId)).toEqual({ status: "skipped" });
    expect(
      (
        await db.select().from(siteJobs).where(eq(siteJobs.id, saved.syncJobId))
      )[0]?.status
    ).toBe("running");
    expect(
      await db
        .select()
        .from(siteDeployments)
        .where(eq(siteDeployments.siteId, siteId))
    ).toEqual([]);
    onBranchHead = async () => {};
    expect(await runSiteJob(saved.syncJobId)).toEqual({ status: "done" });
    expect(
      await db
        .select()
        .from(siteDeployments)
        .where(eq(siteDeployments.siteId, siteId))
    ).toHaveLength(1);
  });

  test("verified origin changes retain their rebuild intent across failed GitHub resolution and identical refresh", async () => {
    const original = await getSite(siteId);
    if (!original) {
      throw new Error("Expected synthetic site");
    }
    const { deployment: live } = await enqueueSiteDeployment({
      siteId,
      kind: "production",
      previewKey: null,
      trigger: "manual",
      branch: "main",
      commitSha: "a".repeat(40),
    });
    objects.set(SITE_R2_KEYS.manifest(siteId, live.id), "{}");
    expect(await activateDeployment(original, live)).toBe("live");
    const jobId = await setSitePublicOrigin(
      original,
      "https://verified.example.test/path",
      null
    );
    expect(branchHeadCalls).toBe(0);
    const current = await getSite(siteId);
    expect(current?.publicOrigin).toBe("https://verified.example.test");
    onBranchHead = async () => {
      throw new Error("Synthetic verified-origin GitHub failure");
    };
    expect(await runSiteJob(jobId)).toEqual({ status: "retrying" });
    if (!current) {
      throw new Error("Expected saved site");
    }
    const identicalJob = await setSitePublicOrigin(
      current,
      current.publicOrigin,
      null
    );
    expect(await runSiteJob(identicalJob)).toEqual({ status: "done" });
    onBranchHead = async () => {};
    await db
      .update(siteJobs)
      .set({ availableAt: new Date(0) })
      .where(eq(siteJobs.id, jobId));
    expect(await runSiteJob(jobId)).toEqual({ status: "done" });
    const build = await db.query.siteJobs.findFirst({
      where: eq(siteJobs.dedupeKey, `settings-build:${jobId}`),
    });
    expect(build?.kind).toBe("build");
    const rebuilt = await db.query.siteDeployments.findFirst({
      where: eq(siteDeployments.id, build?.deploymentId ?? ""),
    });
    expect(rebuilt?.target.publicOrigin).toBe(current.publicOrigin);
    expect(rebuilt?.requestedByUserId).toBeNull();
    await db
      .update(siteJobs)
      .set({ status: "pending", availableAt: new Date(0) })
      .where(eq(siteJobs.id, jobId));
    expect(await runSiteJob(jobId)).toEqual({ status: "done" });
    expect(
      await db.query.siteJobs.findMany({
        where: eq(siteJobs.dedupeKey, `settings-build:${jobId}`),
      })
    ).toHaveLength(1);
    expect(
      JSON.parse(objects.get(SITE_R2_KEYS.state(siteId)) ?? "{}").production
        .deploymentId
    ).toBe(live.id);
  });
}
