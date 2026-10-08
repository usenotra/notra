import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { deferred } from "./utils/deferred";

const databaseUrl = process.env.SITES_TEST_DATABASE_URL;

if (!databaseUrl) {
  test.skip("Organization teardown requires SITES_TEST_DATABASE_URL", () => {});
} else if (process.env.NOTRA_ORGANIZATION_TEARDOWN_WORKER !== "1") {
  test("organization teardown PostgreSQL regressions", () => {
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
          NOTRA_ORGANIZATION_TEARDOWN_WORKER: "1",
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
  const { organizations, sites, siteDomains } =
    await import("@notra/db/schema");
  const { eq, inArray, sql } = await import("drizzle-orm");
  const { SITE_R2_KEYS } = await import("@notra/sites-core/constants/sites");
  const objects = new Map<string, string>();
  const removedProviders: string[] = [];
  const suspended: string[] = [];
  let failWrite = false;
  let failPrefix = false;
  let onWrite = async () => {};
  let onRead = async (_key: string) => {};
  let onCreate = async () => {};
  let providerCreates = 0;
  let organizationId = "";
  let otherOrganizationId = "";
  let hosted: (typeof sites.$inferSelect)[] = [];

  mock.module("../src/r2", () => ({
    r2GetText: async (key: string) => {
      await onRead(key);
      return objects.has(key)
        ? { text: objects.get(key), etag: "synthetic-etag" }
        : null;
    },
    r2Put: async (key: string, text: string) => {
      await onWrite();
      if (failWrite) {
        throw new Error("Synthetic state teardown failure");
      }
      objects.set(key, text);
      if (JSON.parse(text).status === "suspended") {
        suspended.push(key);
      }
      return "synthetic-etag";
    },
    r2DeleteKey: async (key: string) => {
      const record = JSON.parse(objects.get(key) ?? "null");
      if (record) {
        expect(
          JSON.parse(objects.get(SITE_R2_KEYS.state(record.siteId)) ?? "null")
            ?.status
        ).toBe("suspended");
      }
      objects.delete(key);
    },
    r2DeletePrefix: async (prefix: string) => {
      if (failPrefix) {
        throw new Error("Synthetic artifact teardown failure");
      }
      for (const key of objects.keys()) {
        if (key.startsWith(prefix)) {
          objects.delete(key);
        }
      }
    },
  }));
  const cloudflare = await import("../src/cloudflare-saas");
  mock.module("../src/cloudflare-saas", () => ({
    ...cloudflare,
    cloudflareSaasConfig: () => ({
      zoneId: "synthetic",
      apiToken: "synthetic",
    }),
    createCustomHostname: async (_config: unknown, hostname: string) => {
      providerCreates += 1;
      await onCreate();
      return {
        id: crypto.randomUUID(),
        hostname,
        status: "pending",
        ssl: { status: "pending" },
      };
    },
    deleteCustomHostnameQuietly: async (id: string | null) => {
      if (id) {
        removedProviders.push(id);
      }
    },
  }));
  mock.module("@notra/geo-core/geo/ingest", () => ({
    buildGeoIngestSiteToken: () => null,
  }));
  mock.module("@notra/geo-core/ingest/sites", () => ({
    invalidateIngestSiteCaches: async () => {},
  }));
  const { deleteOrganizationSites } = await import("../src/organization");
  const { addSiteDomain } = await import("../src/domains");
  const { deleteSite } = await import("../src/sites");
  const { releaseHostRecord } = await import("../src/state");

  beforeEach(async () => {
    objects.clear();
    removedProviders.length = 0;
    suspended.length = 0;
    failWrite = false;
    failPrefix = false;
    onWrite = async () => {};
    onRead = async () => {};
    onCreate = async () => {};
    providerCreates = 0;
    process.env.SITES_HOSTING_DOMAIN = "notra.site";
    process.env.SITES_PREVIEW_SECRET = "synthetic-organization-domain-secret";
    organizationId = crypto.randomUUID();
    otherOrganizationId = crypto.randomUUID();
    await db.insert(organizations).values(
      [organizationId, otherOrganizationId].map((id) => ({
        id,
        name: "Synthetic teardown workspace",
        slug: id,
        createdAt: new Date(),
      }))
    );
    hosted = await db
      .insert(sites)
      .values(
        [organizationId, organizationId, otherOrganizationId].map((orgId) => {
          const id = crypto.randomUUID();
          return {
            id,
            organizationId: orgId,
            name: "Synthetic hosted site",
            slug: id,
            publicOrigin: `https://${id}.notra.site`,
            mounts: { blog: "/blog" },
          };
        })
      )
      .returning();
    for (const site of hosted) {
      const hostname = `${site.id}.example.test`;
      await db.insert(siteDomains).values({
        id: crypto.randomUUID(),
        siteId: site.id,
        organizationId: site.organizationId,
        hostname,
        kind: "subdomain",
        status: "active",
        cloudflareHostnameId: site.id,
      });
      objects.set(
        SITE_R2_KEYS.host(`${site.slug}.notra.site`),
        JSON.stringify({ version: 1, siteId: site.id, kind: "alias" })
      );
      objects.set(
        SITE_R2_KEYS.host(hostname),
        JSON.stringify({ version: 1, siteId: site.id, kind: "custom" })
      );
      for (const root of ["deployments", "logs", "sites"]) {
        objects.set(`${root}/${site.id}/artifact`, "synthetic");
      }
    }
  });
  afterEach(async () => {
    await db
      .delete(organizations)
      .where(inArray(organizations.id, [organizationId, otherOrganizationId]));
  });
  afterAll(async () => {
    await Reflect.get(db, "$client").end();
  });

  test("single-site deletion waits for admitted creation and cleans the committed provider binding", async () => {
    const own = hosted.find((site) => site.organizationId === organizationId);
    if (!own) {
      throw new Error("Expected synthetic site");
    }
    const entered = deferred();
    const resume = deferred();
    onCreate = async () => {
      entered.resolve();
      await resume.promise;
    };
    const addition = addSiteDomain(own, {
      kind: "subdomain",
      value: `${crypto.randomUUID()}.example.test`,
    });
    addition.catch(() => {});
    await entered.promise;
    const deletion = deleteSite(own);
    deletion.catch(() => {});
    try {
      let blocked = false;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const result = await db.execute(
          sql`select count(*)::int as count from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid() and wait_event_type = 'Lock' and query like '%organization%'`
        );
        if (Number(result.rows[0]?.count) > 0) {
          blocked = true;
          break;
        }
        await delay(10);
      }
      expect(blocked).toBe(true);
      expect(suspended).toEqual([]);
      resume.resolve();
      const added = await addition;
      if (!added.cloudflareHostnameId) {
        throw new Error("Expected synthetic provider binding");
      }
      await deletion;
      expect(removedProviders).toContain(added.cloudflareHostnameId);
      expect(
        await db.select().from(sites).where(eq(sites.id, own.id))
      ).toHaveLength(0);
    } finally {
      resume.resolve();
      await Promise.allSettled([addition, deletion]);
    }
  });

  test("single-site deletion blocks add before provider creation and a deleted parent fails insertion", async () => {
    const own = hosted.find((site) => site.organizationId === organizationId);
    if (!own) {
      throw new Error("Expected synthetic site");
    }
    const entered = deferred();
    const resume = deferred();
    onWrite = async () => {
      entered.resolve();
      await resume.promise;
    };
    const deletion = deleteSite(own);
    deletion.catch(() => {});
    await entered.promise;
    const addition = addSiteDomain(own, {
      kind: "subdomain",
      value: `${crypto.randomUUID()}.example.test`,
    });
    addition.catch(() => {});
    try {
      await delay(20);
      expect(providerCreates).toBe(0);
      resume.resolve();
      await deletion;
      await expect(addition).rejects.toThrow();
      expect(providerCreates).toBe(0);
    } finally {
      resume.resolve();
      await Promise.allSettled([addition, deletion]);
    }
  });

  test("single-site deletion reads serving access on its admitted connection with a saturated primary pool", async () => {
    const own = hosted.find((site) => site.organizationId === organizationId);
    if (!own) {
      throw new Error("Expected synthetic site");
    }
    const entered = deferred();
    const resume = deferred();
    onRead = async (key) => {
      if (key === SITE_R2_KEYS.state(own.id)) {
        entered.resolve();
        await resume.promise;
      }
    };
    const primary = Reflect.get(db, "$client");
    const { withSiteHostLock } = await import("../src/utils/site-host-lock");
    const deletion = deleteSite(own);
    deletion.catch(() => {});
    await entered.promise;
    const waiters = Array.from({ length: primary.options.max - 1 }, () =>
      withSiteHostLock(`${own.slug}.notra.site`, async () => {}, {
        organizationId,
      })
    );
    const results = Promise.allSettled(waiters);
    try {
      for (
        let attempt = 0;
        attempt < 100 &&
        (primary.totalCount !== primary.options.max || primary.idleCount !== 0);
        attempt += 1
      ) {
        await delay(10);
      }
      expect(primary.totalCount).toBe(primary.options.max);
      expect(primary.idleCount).toBe(0);
      resume.resolve();
      await Promise.race([
        deletion,
        delay(2000).then(() => {
          throw new Error("Deletion borrowed a starved connection");
        }),
      ]);
      expect(
        (await results).every((result) => result.status === "fulfilled")
      ).toBe(true);
    } finally {
      resume.resolve();
      await Promise.allSettled([deletion, ...waiters]);
    }
  });

  test("both sites are offline and unbound before cascade, without touching another workspace", async () => {
    const foreign = hosted.filter(
      (site) => site.organizationId === otherOrganizationId
    );
    const own = hosted.filter((site) => site.organizationId === organizationId);
    const foreignObjects = [...objects].filter(([key]) =>
      foreign.some((site) => key.includes(site.id))
    );
    await db.transaction(async (tx) => {
      await deleteOrganizationSites(organizationId, tx);
      expect(
        await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId))
      ).toHaveLength(1);
      expect(
        await tx
          .select()
          .from(sites)
          .where(eq(sites.organizationId, organizationId))
      ).toHaveLength(0);
      expect(
        await tx
          .select()
          .from(siteDomains)
          .where(eq(siteDomains.organizationId, organizationId))
      ).toHaveLength(0);
      for (const site of own) {
        expect(suspended).toContain(SITE_R2_KEYS.state(site.id));
        expect([...objects.keys()].some((key) => key.includes(site.id))).toBe(
          false
        );
        expect(removedProviders).toContain(site.id);
      }
      await tx
        .delete(organizations)
        .where(eq(organizations.id, organizationId));
    });
    expect(
      await db
        .select()
        .from(sites)
        .where(eq(sites.organizationId, otherOrganizationId))
    ).toHaveLength(1);
    expect(
      await db
        .select()
        .from(siteDomains)
        .where(eq(siteDomains.organizationId, otherOrganizationId))
    ).toHaveLength(1);
    expect([...objects]).toEqual(foreignObjects);
  });

  test.each(["state", "artifacts"])(
    "%s failure rolls back the cascade and permits a bounded retry",
    async (failure) => {
      failWrite = failure === "state";
      failPrefix = failure === "artifacts";
      await expect(
        db.transaction(async (tx) => {
          await deleteOrganizationSites(organizationId, tx);
          await tx
            .delete(organizations)
            .where(eq(organizations.id, organizationId));
        })
      ).rejects.toThrow(
        `Synthetic ${failure === "state" ? "state" : "artifact"} teardown failure`
      );
      expect(
        await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId))
      ).toHaveLength(1);
      expect(
        await db
          .select()
          .from(sites)
          .where(eq(sites.organizationId, organizationId))
      ).toHaveLength(2);
      expect(
        await db
          .select()
          .from(siteDomains)
          .where(eq(siteDomains.organizationId, organizationId))
      ).toHaveLength(2);
      failWrite = false;
      failPrefix = false;
      await db.transaction(async (tx) => {
        await deleteOrganizationSites(organizationId, tx);
        await tx
          .delete(organizations)
          .where(eq(organizations.id, organizationId));
      });
      expect(
        await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId))
      ).toHaveLength(0);
    }
  );

  test("legacy workspace without sites does not require hosting configuration", async () => {
    await db.delete(sites).where(eq(sites.organizationId, organizationId));
    delete process.env.SITES_HOSTING_DOMAIN;
    failWrite = true;
    failPrefix = true;
    await db.transaction(async (tx) => {
      await deleteOrganizationSites(organizationId, tx);
      await tx
        .delete(organizations)
        .where(eq(organizations.id, organizationId));
    });
    expect(suspended).toHaveLength(0);
    expect(removedProviders).toHaveLength(0);
  });

  test("organization lock blocks a concurrent new site's foreign-key insert", async () => {
    let checked = false;
    onWrite = async () => {
      if (checked) {
        return;
      }
      checked = true;
      await expect(
        db.transaction(async (tx) => {
          await tx.execute(sql`set local lock_timeout = '100ms'`);
          const id = crypto.randomUUID();
          await tx.insert(sites).values({
            id,
            organizationId,
            name: "Concurrent site",
            slug: id,
            publicOrigin: `https://${id}.notra.site`,
            mounts: { blog: "/blog" },
          });
        })
      ).rejects.toMatchObject({
        cause: {
          code: "55P03",
          message: "canceling statement due to lock timeout",
        },
      });
    };
    await db.transaction(async (tx) => {
      await deleteOrganizationSites(organizationId, tx);
      await tx
        .delete(organizations)
        .where(eq(organizations.id, organizationId));
    });
    expect(checked).toBe(true);
  });

  test("deletion blocks same-workspace failed-host add before provider effects", async () => {
    const own = hosted.filter((site) => site.organizationId === organizationId);
    const first = own[0];
    const second = own[1];
    if (!(first && second)) {
      throw new Error("Expected two sites");
    }
    const hostname = `${first.id}.example.test`;
    await db
      .update(siteDomains)
      .set({ status: "failed" })
      .where(eq(siteDomains.siteId, first.id));
    let addition: Promise<unknown> | undefined;
    let checked = false;
    onWrite = async () => {
      if (checked) {
        return;
      }
      checked = true;
      addition = addSiteDomain(second, { kind: "subdomain", value: hostname });
      addition.catch(() => {});
      let blocked = false;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const result = await db.execute(
          sql`select count(*)::int as count from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid() and wait_event_type = 'Lock' and query like '%organization%'`
        );
        if (Number(result.rows[0]?.count) > 0) {
          blocked = true;
          break;
        }
        await delay(10);
      }
      expect(blocked).toBe(true);
      expect(providerCreates).toBe(0);
    };
    try {
      await db.transaction(async (tx) => {
        await deleteOrganizationSites(organizationId, tx);
        await tx
          .delete(organizations)
          .where(eq(organizations.id, organizationId));
      });
    } finally {
      await Promise.allSettled(addition ? [addition] : []);
    }
    expect(checked).toBe(true);
    expect(providerCreates).toBe(0);
    if (!addition) {
      throw new Error("Expected the concurrent domain add");
    }
    await expect(addition).rejects.toThrow("Workspace not found");
    expect(
      await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
    ).toHaveLength(0);
  });

  test("domain add holds organization and host admission until insert commits", async () => {
    const own = hosted.filter((site) => site.organizationId === organizationId);
    const first = own[0];
    const second = own[1];
    if (!(first && second)) {
      throw new Error("Expected two sites");
    }
    await db
      .update(siteDomains)
      .set({ status: "failed" })
      .where(eq(siteDomains.siteId, first.id));
    const entered = deferred();
    const release = deferred();
    onCreate = async () => {
      entered.resolve();
      await release.promise;
    };
    const addition = addSiteDomain(second, {
      kind: "subdomain",
      value: `${first.id}.example.test`,
    });
    addition.catch(() => {});
    await entered.promise;
    let deletionPid = 0;
    const deletion = db.transaction(async (tx) => {
      const result = await tx.execute(sql`select pg_backend_pid() as pid`);
      deletionPid = Number(result.rows[0]?.pid);
      await deleteOrganizationSites(organizationId, tx);
      await tx
        .delete(organizations)
        .where(eq(organizations.id, organizationId));
    });
    deletion.catch(() => {});
    try {
      let blockers: unknown[] = [];
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const result = await db.execute(
          sql`select pg_blocking_pids(${deletionPid}) as blockers`
        );
        blockers = result.rows[0]?.blockers as unknown[];
        if (blockers.length) {
          break;
        }
        await delay(10);
      }
      expect(blockers).toHaveLength(1);
      expect(suspended).toHaveLength(0);
      expect(removedProviders).toHaveLength(0);
      const locks = await db.execute(
        sql`select count(*)::int as count from pg_locks where pid = ${Number(blockers[0])} and locktype = 'advisory' and granted`
      );
      expect(Number(locks.rows[0]?.count)).toBeGreaterThan(0);
    } finally {
      release.resolve();
      await Promise.allSettled([addition, deletion]);
    }
    const domain = await addition;
    await deletion;
    expect(removedProviders).toContain(domain.cloudflareHostnameId as string);
    expect(
      await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
    ).toHaveLength(0);
  });

  test("opposite failed-host row orders use shared sorted locks across workspace deletions", async () => {
    const own = hosted.filter((site) => site.organizationId === organizationId);
    const foreign = hosted.find(
      (site) => site.organizationId === otherOrganizationId
    );
    const first = own[0];
    if (!(first && foreign)) {
      throw new Error("Expected sites in both workspaces");
    }
    const hostnames = ["a", "z"]
      .map((prefix) => `${prefix}-${crypto.randomUUID()}.example.test`)
      .sort();
    for (const [site, names] of [
      [first, hostnames],
      [foreign, [...hostnames].reverse()],
    ] as const) {
      for (const hostname of names) {
        await db.insert(siteDomains).values({
          id: crypto.randomUUID(),
          siteId: site.id,
          organizationId: site.organizationId,
          hostname,
          kind: "subdomain",
          status: "failed",
        });
      }
    }
    const outsideId = crypto.randomUUID();
    for (const hostname of hostnames) {
      objects.set(
        SITE_R2_KEYS.host(hostname),
        JSON.stringify({ version: 1, siteId: outsideId, kind: "custom" })
      );
    }
    const blockerReady = deferred();
    const unblock = deferred();
    const held = db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`sites-host:${hostnames[0]}`}, 0))`
      );
      blockerReady.resolve();
      await unblock.promise;
    });
    held.catch(() => {});
    await blockerReady.promise;
    const deletions = [organizationId, otherOrganizationId].map((id) =>
      db.transaction(async (tx) => {
        await deleteOrganizationSites(id, tx);
        await tx.delete(organizations).where(eq(organizations.id, id));
      })
    );
    for (const deletion of deletions) {
      deletion.catch(() => {});
    }
    try {
      let waits = 0;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const result = await db.execute(
          sql`select count(*)::int as count from pg_locks where locktype = 'advisory' and not granted and database = (select oid from pg_database where datname = current_database())`
        );
        waits = Number(result.rows[0]?.count);
        if (waits >= 2) {
          break;
        }
        await delay(10);
      }
      expect(waits).toBe(2);
      expect(suspended).toHaveLength(0);
      await db.transaction(async (tx) => {
        const result = await tx.execute(
          sql`select pg_try_advisory_xact_lock(hashtextextended(${`sites-host:${hostnames[1]}`}, 0)) as acquired`
        );
        expect(result.rows[0]?.acquired).toBe(true);
      });
    } finally {
      unblock.resolve();
      await Promise.allSettled([held, ...deletions]);
    }
    await Promise.all([held, ...deletions]);
    for (const hostname of hostnames) {
      expect(
        JSON.parse(objects.get(SITE_R2_KEYS.host(hostname)) ?? "null")?.siteId
      ).toBe(outsideId);
    }
    expect(
      await db
        .select()
        .from(organizations)
        .where(inArray(organizations.id, [organizationId, otherOrganizationId]))
    ).toHaveLength(0);
  });

  test("host release with a supplied transaction still waits for the hostname lock", async () => {
    const site = hosted[0];
    if (!site) {
      throw new Error("Expected a site");
    }
    const hostname = `${site.slug}.notra.site`;
    const key = SITE_R2_KEYS.host(hostname);
    objects.set(
      SITE_R2_KEYS.state(site.id),
      JSON.stringify({ status: "suspended" })
    );
    const entered = deferred();
    const unblock = deferred();
    const held = db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`sites-host:${hostname}`}, 0))`
      );
      entered.resolve();
      await unblock.promise;
    });
    held.catch(() => {});
    await entered.promise;
    let releasePid = 0;
    const release = db.transaction(async (tx) => {
      const result = await tx.execute(sql`select pg_backend_pid() as pid`);
      releasePid = Number(result.rows[0]?.pid);
      await releaseHostRecord(hostname, site.id, tx);
    });
    release.catch(() => {});
    try {
      let waits = 0;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const result = await db.execute(
          sql`select count(*)::int as count from pg_locks where pid = ${releasePid} and locktype = 'advisory' and not granted`
        );
        waits = Number(result.rows[0]?.count);
        if (waits) {
          break;
        }
        await delay(10);
      }
      expect(waits).toBe(1);
      expect(objects.has(key)).toBe(true);
    } finally {
      unblock.resolve();
      await Promise.allSettled([held, release]);
    }
    await Promise.all([held, release]);
    expect(objects.has(key)).toBe(false);
  });
}
