import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.SITES_TEST_DATABASE_URL;
if (!databaseUrl) {
  test.skip("Published production projection requires synthetic PostgreSQL", () => {});
} else if (process.env.NOTRA_SITES_PROJECTION_TEST_WORKER !== "1") {
  test("published production projection, rollback and durable repair", () => {
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
          NOTRA_SITES_PROJECTION_TEST_WORKER: "1",
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
  const { organizations, siteDeployments, siteDrafts, siteJobs, sites } =
    await import("@notra/db/schema");
  const { eq } = await import("drizzle-orm");
  const { SITE_R2_KEYS } = await import("@notra/sites-core/constants/sites");
  const objects = new Map<string, string>();
  const invalidate = mock(async () => {});
  mock.module("@notra/geo-core/ingest/sites", () => ({
    invalidateIngestSiteCaches: invalidate,
  }));
  mock.module("@notra/geo-core/geo/ingest", () => ({
    buildGeoIngestSiteToken: () => null,
  }));
  mock.module("../src/r2", () => ({
    r2GetText: async (key: string) =>
      objects.has(key) ? { text: objects.get(key), etag: "synthetic" } : null,
    r2Put: async (key: string, value: string) => {
      objects.set(key, value);
      return "synthetic";
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
  const { activateDeployment, restoreProductionDeployment } =
    await import("../src/activation");
  const { enqueueSiteDeployment, getSite } = await import("../src/deployments");
  const { updateSiteSettings } = await import("../src/sites");
  const { runSiteJob } = await import("../src/runner");
  let organizationId = "";
  let siteId = "";
  process.env.SITES_HOSTING_DOMAIN = "notra.site";
  beforeEach(async () => {
    objects.clear();
    invalidate.mockClear();
    organizationId = `projection-${crypto.randomUUID()}`;
    siteId = `${organizationId}-site`;
    await db.insert(organizations).values({
      id: organizationId,
      name: "Synthetic projection",
      slug: organizationId,
      createdAt: new Date(),
    });
    await db.insert(sites).values({
      id: siteId,
      organizationId,
      name: "Synthetic projection",
      slug: crypto.randomUUID().slice(0, 8),
      publicOrigin: "https://old.example.test",
      mounts: { blog: "/blog" },
    });
  });
  afterEach(async () => {
    await db.delete(organizations).where(eq(organizations.id, organizationId));
  });
  afterAll(async () => {
    await Reflect.get(db, "$client").end();
  });

  test("queued and failed rebuilds retain the active target; successful activation and rollback switch only the pointer", async () => {
    const site = await getSite(siteId);
    if (!site) {
      throw new Error("Expected synthetic site");
    }
    const { deployment: old } = await enqueueSiteDeployment({
      siteId,
      kind: "production",
      previewKey: null,
      trigger: "manual",
      branch: "main",
      commitSha: "a".repeat(40),
    });
    objects.set(SITE_R2_KEYS.manifest(siteId, old.id), "{}");
    expect(await activateDeployment(site, old)).toBe("live");
    expect((await getSite(siteId))?.activeProductionDeploymentId).toBe(old.id);
    const desired = await updateSiteSettings(
      site,
      { publicOrigin: "https://new.example.test", mounts: { blog: "/news" } },
      null
    );
    const { deployment: failed } = await enqueueSiteDeployment({
      siteId,
      kind: "production",
      previewKey: null,
      trigger: "config",
      branch: "main",
      commitSha: "b".repeat(40),
    });
    await db
      .update(siteDeployments)
      .set({ status: "failed" })
      .where(eq(siteDeployments.id, failed.id));
    expect((await getSite(siteId))?.activeProductionDeploymentId).toBe(old.id);
    const { deployment: next } = await enqueueSiteDeployment({
      siteId,
      kind: "production",
      previewKey: null,
      trigger: "config",
      branch: "main",
      commitSha: "c".repeat(40),
    });
    objects.set(SITE_R2_KEYS.manifest(siteId, next.id), "{}");
    expect(await activateDeployment(desired.site, next)).toBe("live");
    expect((await getSite(siteId))?.activeProductionDeploymentId).toBe(next.id);
    expect(await activateDeployment(site, old)).toBe("not_live");
    expect((await getSite(siteId))?.activeProductionDeploymentId).toBe(next.id);
    expect(await restoreProductionDeployment(site, old)).toBe("live");
    expect((await getSite(siteId))?.activeProductionDeploymentId).toBe(old.id);
    expect(invalidate).toHaveBeenCalledWith(siteId, organizationId);
    expect(invalidate.mock.calls.length).toBe(4);
  });

  test("already-active CAS and fenced sync repair projection from the actual R2 pointer, not a newer ready row", async () => {
    const site = await getSite(siteId);
    if (!site) {
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
    expect(await activateDeployment(site, live)).toBe("live");
    const { deployment: newer } = await enqueueSiteDeployment({
      siteId,
      kind: "production",
      previewKey: null,
      trigger: "manual",
      branch: "main",
      commitSha: "b".repeat(40),
    });
    await db
      .update(siteDeployments)
      .set({ status: "ready" })
      .where(eq(siteDeployments.id, newer.id));
    await db
      .update(sites)
      .set({ activeProductionDeploymentId: null })
      .where(eq(sites.id, siteId));
    expect(await activateDeployment(site, live)).toBe("live");
    expect((await getSite(siteId))?.activeProductionDeploymentId).toBe(live.id);
    await db
      .update(sites)
      .set({ activeProductionDeploymentId: null })
      .where(eq(sites.id, siteId));
    const repairJobId = `${siteId}-repair`;
    await db.insert(siteJobs).values({
      id: repairJobId,
      siteId,
      kind: "sync_state",
      payload: {
        rebuild: false,
        removePreviewsThrough: null,
        requestedByUserId: null,
      },
    });
    expect(await runSiteJob(repairJobId)).toEqual({ status: "done" });
    expect((await getSite(siteId))?.activeProductionDeploymentId).toBe(live.id);
    expect((await getSite(siteId))?.activeProductionDeploymentId).not.toBe(
      newer.id
    );
    await db
      .update(sites)
      .set({ activeProductionDeploymentId: null })
      .where(eq(sites.id, siteId));
    const beforeNoop = await getSite(siteId);
    if (!beforeNoop) {
      throw new Error(
        "Expected the locked site snapshot before the no-op save"
      );
    }
    const noop = await updateSiteSettings(site, {}, null);
    expect(noop.site).toEqual(beforeNoop);
    expect(noop.rebuilding).toBe(false);
    expect(await runSiteJob(noop.syncJobId)).toEqual({ status: "done" });
    expect((await getSite(siteId))?.activeProductionDeploymentId).toBe(live.id);
    objects.delete(SITE_R2_KEYS.state(siteId));
    const unbuiltJobId = `${siteId}-unbuilt-repair`;
    await db.insert(siteJobs).values({
      id: unbuiltJobId,
      siteId,
      kind: "sync_state",
      payload: {
        rebuild: false,
        removePreviewsThrough: null,
        requestedByUserId: null,
      },
    });
    expect(await runSiteJob(unbuiltJobId)).toEqual({ status: "done" });
    expect((await getSite(siteId))?.activeProductionDeploymentId).toBeNull();
  });

  test("a suspended site does not activate or change the production projection", async () => {
    const site = await getSite(siteId);
    if (!site) {
      throw new Error("Expected synthetic site");
    }
    const { deployment } = await enqueueSiteDeployment({
      siteId,
      kind: "production",
      previewKey: null,
      trigger: "manual",
      branch: "main",
      commitSha: "a".repeat(40),
    });
    objects.set(SITE_R2_KEYS.manifest(siteId, deployment.id), "{}");
    await db
      .update(sites)
      .set({ status: "suspended" })
      .where(eq(sites.id, siteId));
    expect(await activateDeployment(site, deployment)).toBe("not_live");
    expect((await getSite(siteId))?.activeProductionDeploymentId).toBeNull();
    expect(invalidate).not.toHaveBeenCalled();
  });

  test("durable repair refuses a foreign R2 pointer instead of inventing ownership", async () => {
    const site = await getSite(siteId);
    if (!site) {
      throw new Error("Expected synthetic site");
    }
    const foreignId = `${siteId}-foreign`;
    await db.insert(sites).values({
      id: foreignId,
      organizationId,
      name: "Foreign synthetic site",
      slug: crypto.randomUUID().slice(0, 8),
      publicOrigin: "https://foreign.example.test",
      mounts: { blog: "/" },
    });
    const { deployment: foreign } = await enqueueSiteDeployment({
      siteId: foreignId,
      kind: "production",
      previewKey: null,
      trigger: "manual",
      branch: "main",
      commitSha: "a".repeat(40),
    });
    const saved = await updateSiteSettings(
      site,
      { previewVisibility: "public" },
      null
    );
    expect(await runSiteJob(saved.syncJobId)).toEqual({ status: "done" });
    const state = JSON.parse(objects.get(SITE_R2_KEYS.state(siteId)) ?? "{}");
    state.production = {
      deploymentId: foreign.id,
      generation: foreign.generation,
      activatedAt: new Date().toISOString(),
    };
    objects.set(SITE_R2_KEYS.state(siteId), JSON.stringify(state));
    const repair = await updateSiteSettings(site, {}, null);
    expect(await runSiteJob(repair.syncJobId)).toEqual({ status: "done" });
    expect((await getSite(siteId))?.activeProductionDeploymentId).toBeNull();
  });

  test("source-context changes reject existing drafts inside the settings transaction", async () => {
    const site = await getSite(siteId);
    if (!site) {
      throw new Error("Expected synthetic site");
    }
    await db.insert(siteDrafts).values({
      id: `${siteId}-draft`,
      siteId,
      path: "blog/post.mdx",
      content: "Synthetic draft",
    });
    for (const patch of [
      { rootDirectory: "new" },
      { productionBranch: "new" },
    ]) {
      await expect(updateSiteSettings(site, patch, null)).rejects.toThrow(
        "Publish or discard"
      );
    }
    expect((await getSite(siteId))?.rootDirectory).toBe("");
    expect((await getSite(siteId))?.productionBranch).toBe("main");
    expect(
      await db.select().from(siteJobs).where(eq(siteJobs.siteId, siteId))
    ).toHaveLength(0);
    expect(
      await db.select().from(siteDrafts).where(eq(siteDrafts.siteId, siteId))
    ).toHaveLength(1);
  });
}
