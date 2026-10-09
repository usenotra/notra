import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { Effect } from "effect";

import type { EnqueueDeploymentInput } from "../src/types/deployments";
import { deferred } from "./utils/deferred";
import { waitForPgBlocker } from "./utils/wait-for-pg-blocker";

const databaseUrl = process.env.SITES_TEST_DATABASE_URL;
if (!databaseUrl) {
  test.skip("Deployment admission requires SITES_TEST_DATABASE_URL", () => {});
} else if (process.env.NOTRA_DEPLOYMENT_ADMISSION_WORKER !== "1") {
  test("real PostgreSQL deployment organization admission", () => {
    const url = new URL(databaseUrl);
    expect(url.hostname).toBe("127.0.0.1");
    expect(url.pathname).toBe("/notra_server_audit");
    url.searchParams.set(
      "options",
      "-c statement_timeout=3000 -c lock_timeout=1500"
    );
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: {
          ...process.env,
          DATABASE_URL: url.toString(),
          NOTRA_DEPLOYMENT_ADMISSION_WORKER: "1",
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
        },
        encoding: "utf8",
        timeout: 30_000,
      }
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
  });
} else {
  const { db } = await import("@notra/db/drizzle");
  const { organizations, sites, siteJobs, siteDeployments } =
    await import("@notra/db/schema");
  const { eq, sql } = await import("drizzle-orm");
  const {
    enqueueSiteDeployment,
    enqueueSettingsDeployment,
    allocateGeneration,
  } = await import("../src/deployments");
  let organizationId = "";
  let siteId = "";
  let jobId = "";
  const effects: string[] = [];
  const r2 = {
    r2GetText: async () => null,
    r2Put: async (key: string) => {
      effects.push(key);
      return "synthetic-etag";
    },
    r2DeleteKey: async (key: string) => {
      effects.push(key);
    },
    r2DeletePrefix: async (key: string) => {
      effects.push(key);
    },
  };
  mock.module("../src/r2", () => ({
    ...r2,
    r2GetTextEffect: (...args: Parameters<typeof r2.r2GetText>) =>
      Effect.tryPromise({
        try: () => r2.r2GetText(...args),
        catch: (error) => error,
      }),
    r2PutEffect: (...args: Parameters<typeof r2.r2Put>) =>
      Effect.tryPromise({
        try: () => r2.r2Put(...args),
        catch: (error) => error,
      }),
  }));
  const cloudflare = await import("../src/cloudflare-saas");
  mock.module("../src/cloudflare-saas", () => ({
    ...cloudflare,
    deleteCustomHostnameQuietly: async () => {},
  }));
  mock.module("@notra/geo-core/geo/ingest", () => ({
    buildGeoIngestSiteToken: () => null,
  }));
  mock.module("@notra/geo-core/ingest/sites", () => ({
    invalidateIngestSiteCaches: async () => {},
  }));
  const { deleteOrganizationSites } = await import("../src/organization");

  beforeEach(async () => {
    effects.length = 0;
    organizationId = crypto.randomUUID();
    siteId = crypto.randomUUID();
    jobId = crypto.randomUUID();
    process.env.SITES_HOSTING_DOMAIN = "notra.site";
    await db.insert(organizations).values({
      id: organizationId,
      name: "Synthetic admission",
      slug: organizationId,
      createdAt: new Date(),
    });
    await db.insert(sites).values({
      id: siteId,
      organizationId,
      name: "Synthetic admission",
      slug: siteId,
      publicOrigin: `https://${siteId}.notra.site`,
      mounts: { blog: "/blog" },
    });
    await db.insert(siteJobs).values({
      id: jobId,
      siteId,
      kind: "sync_state",
      status: "running",
      attempts: 1,
      leaseUntil: sql`now() + interval '1 hour'`,
    });
  });
  afterEach(async () => {
    await db.delete(organizations).where(eq(organizations.id, organizationId));
  });
  afterAll(async () => {
    await Reflect.get(db, "$client").end();
  });

  test.each(["normal", "settings"])(
    "%s enqueue waits for deletion before taking site/job rows",
    async (kind) => {
      const input: EnqueueDeploymentInput = {
        siteId,
        kind: "production",
        previewKey: null,
        trigger: "manual",
        branch: "main",
        commitSha: "a".repeat(40),
      };
      const admitted = deferred();
      const proceed = deferred();
      let deletionPid = 0;
      const deletion = db.transaction(async (tx) => {
        const result = await tx.execute(sql`select pg_backend_pid() as pid`);
        deletionPid = Number(result.rows[0]?.pid);
        await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId))
          .for("update");
        admitted.resolve();
        await proceed.promise;
        await deleteOrganizationSites(organizationId, tx);
        await tx
          .delete(organizations)
          .where(eq(organizations.id, organizationId));
      });
      deletion.catch(() => {});
      await admitted.promise;
      const enqueue =
        kind === "normal"
          ? enqueueSiteDeployment(input)
          : enqueueSettingsDeployment(input, { id: jobId, attempts: 1 });
      enqueue.catch(() => {});
      try {
        const enqueuePid = await waitForPgBlocker(db, deletionPid);
        const waiting = await db.execute(
          sql`select query from pg_stat_activity where pid = ${enqueuePid}`
        );
        expect(waiting.rows[0]?.query).toContain('"organizations"');
        expect(waiting.rows[0]?.query).toContain("for key share");
        await db.transaction(async (tx) => {
          const rows = await tx.execute(
            sql`select id, last_generation from sites where id = ${siteId} for update nowait`
          );
          expect(rows.rows[0]?.last_generation).toBe(0);
          const jobs = await tx.execute(
            sql`select id from site_jobs where id = ${jobId} for update nowait`
          );
          expect(jobs.rows).toHaveLength(1);
        });
        expect(effects).toHaveLength(0);
      } finally {
        proceed.resolve();
        await Promise.allSettled([deletion, enqueue]);
      }
      await deletion;
      if (kind === "normal") {
        await expect(enqueue).rejects.toThrow("workspace not found");
      } else {
        expect(await enqueue).toBeNull();
      }
      expect(effects.length).toBeGreaterThan(0);
      expect(
        await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId))
      ).toHaveLength(0);
    }
  );

  test.each(["normal", "settings"])(
    "%s enqueue admits the organization before waiting for site/job rows",
    async (kind) => {
      const input: EnqueueDeploymentInput = {
        siteId,
        kind: "production",
        previewKey: null,
        trigger: "manual",
        branch: "main",
        commitSha: "b".repeat(40),
      };
      const entered = deferred();
      const unblock = deferred();
      let blockerPid = 0;
      const holder = db.transaction(async (tx) => {
        const result = await tx.execute(sql`select pg_backend_pid() as pid`);
        blockerPid = Number(result.rows[0]?.pid);
        if (kind === "normal") {
          await tx
            .select()
            .from(sites)
            .where(eq(sites.id, siteId))
            .for("update");
        } else {
          await tx
            .select()
            .from(siteJobs)
            .where(eq(siteJobs.id, jobId))
            .for("update");
        }
        entered.resolve();
        await unblock.promise;
      });
      holder.catch(() => {});
      await entered.promise;
      const enqueue =
        kind === "normal"
          ? enqueueSiteDeployment(input)
          : enqueueSettingsDeployment(input, { id: jobId, attempts: 1 });
      enqueue.catch(() => {});
      let deletion: Promise<void> | undefined;
      try {
        const enqueuePid = await waitForPgBlocker(db, blockerPid);
        const query = await db.execute(
          sql`select query from pg_stat_activity where pid = ${enqueuePid}`
        );
        expect(query.rows[0]?.query).toContain(
          kind === "normal" ? '"sites"' : '"site_jobs"'
        );
        deletion = db.transaction(async (tx) => {
          await tx
            .select()
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .for("update");
          const committed = await tx
            .select()
            .from(siteDeployments)
            .where(eq(siteDeployments.siteId, siteId));
          expect(committed).toHaveLength(1);
          const deployment = committed[0];
          if (!deployment) {
            throw new Error("Expected the admitted deployment");
          }
          expect(deployment.organizationId).toBe(organizationId);
          expect(deployment.generation).toBe(1);
          expect(deployment.configHash).toHaveLength(16);
          const builds = await tx
            .select()
            .from(siteJobs)
            .where(eq(siteJobs.deploymentId, deployment.id));
          expect(builds).toHaveLength(1);
          expect(builds[0]?.dedupeKey).toBe(
            kind === "settings"
              ? `settings-build:${jobId}`
              : `build:${deployment.id}`
          );
          await deleteOrganizationSites(organizationId, tx);
          await tx
            .delete(organizations)
            .where(eq(organizations.id, organizationId));
        });
        deletion.catch(() => {});
        const deletionPid = await waitForPgBlocker(db, enqueuePid);
        const waiting = await db.execute(
          sql`select query from pg_stat_activity where pid = ${deletionPid}`
        );
        expect(waiting.rows[0]?.query).toContain('"organizations"');
        expect(waiting.rows[0]?.query).toContain("for update");
        expect(effects).toHaveLength(0);
        expect(
          await db
            .select()
            .from(siteDeployments)
            .where(eq(siteDeployments.siteId, siteId))
        ).toHaveLength(0);
      } finally {
        unblock.resolve();
        await Promise.allSettled([
          holder,
          enqueue,
          ...(deletion ? [deletion] : []),
        ]);
      }
      await holder;
      const result = await enqueue;
      expect(result).not.toBeNull();
      if (typeof result !== "string" && result) {
        expect(result.deployment.generation).toBe(1);
        expect(result.deployment.organizationId).toBe(organizationId);
        expect(result.deployment.configHash).toHaveLength(16);
      }
      await deletion;
      expect(effects.length).toBeGreaterThan(0);
      expect(
        await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId))
      ).toHaveLength(0);
    }
  );

  test("legacy generation-before-FK ordering creates a real SQL lock cycle after external effects", async () => {
    const siteLocked = deferred();
    const insert = deferred();
    let enqueuePid = 0;
    const enqueue = db.transaction(async (tx) => {
      const result = await tx.execute(sql`select pg_backend_pid() as pid`);
      enqueuePid = Number(result.rows[0]?.pid);
      const site = await allocateGeneration(tx, siteId);
      siteLocked.resolve();
      await insert.promise;
      await tx.insert(siteDeployments).values({
        id: crypto.randomUUID(),
        siteId,
        organizationId,
        kind: "production",
        trigger: "manual",
        status: "queued",
        generation: site.lastGeneration,
        branch: "main",
        commitSha: "c".repeat(40),
        target: {
          publicOrigin: site.publicOrigin,
          mounts: site.mounts,
          noindex: false,
          branding: true,
        },
        configHash: "synthetic",
      });
    });
    enqueue.catch(() => {});
    await siteLocked.promise;
    let deletionPid = 0;
    const deletion = db.transaction(async (tx) => {
      await tx.execute(sql`set local lock_timeout = '500ms'`);
      const result = await tx.execute(sql`select pg_backend_pid() as pid`);
      deletionPid = Number(result.rows[0]?.pid);
      await tx
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .for("update");
      effects.push("synthetic irreversible suspension");
      await tx.delete(sites).where(eq(sites.id, siteId));
    });
    deletion.catch(() => {});
    try {
      expect(await waitForPgBlocker(db, enqueuePid)).toBe(deletionPid);
      insert.resolve();
      expect(await waitForPgBlocker(db, deletionPid)).toBe(enqueuePid);
      expect(effects).toEqual(["synthetic irreversible suspension"]);
    } finally {
      insert.resolve();
      await Promise.allSettled([enqueue, deletion]);
    }
    await expect(deletion).rejects.toMatchObject({ cause: { code: "55P03" } });
    await enqueue;
    expect(
      await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
    ).toHaveLength(1);
    expect(
      await db.select().from(sites).where(eq(sites.id, siteId))
    ).toHaveLength(1);
    expect(effects).toEqual(["synthetic irreversible suspension"]);
  });
}
