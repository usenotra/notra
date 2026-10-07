import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
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
  const { organizations, sites, siteJobs, siteDeployments } =
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
  } = await import("../src/deployments");
  const { withSiteStorageLock } =
    await import("../src/utils/site-storage-lock");
  let organizationId = "";
  let siteId = "";
  const objects = new Map<string, string>();
  let onStateWrite = async () => {};
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
  const { updateSiteSettings } = await import("../src/sites");
  const { runSiteJob } = await import("../src/runner");
  const { SITE_R2_KEYS } = await import("@notra/sites-core/constants/sites");
  process.env.SITES_HOSTING_DOMAIN = "notra.site";

  beforeEach(async () => {
    objects.clear();
    onStateWrite = async () => {};
    organizationId = `sites-audit-${crypto.randomUUID()}`;
    siteId = `${organizationId}-site`;
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
      "synthetic-admin"
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
    expect(disabled.previewRemovalJobIds).toHaveLength(1);
    const removalId = disabled.previewRemovalJobIds[0];
    if (!removalId) {
      throw new Error("Expected synthetic preview removal");
    }
    expect(await runSiteJob(removalId)).toEqual({
      status: "done",
    });
    expect(
      JSON.parse(objects.get(SITE_R2_KEYS.state(siteId)) ?? "{}").previews
    ).toEqual({});
  });
}
