import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
  let organizationId = "";
  let otherOrganizationId = "";
  let hosted: (typeof sites.$inferSelect)[] = [];

  mock.module("../src/r2", () => ({
    r2GetText: async (key: string) =>
      objects.has(key)
        ? { text: objects.get(key), etag: "synthetic-etag" }
        : null,
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
    deleteCustomHostnameQuietly: async (id: string) => {
      removedProviders.push(id);
    },
  }));
  mock.module("@notra/geo-core/geo/ingest", () => ({
    buildGeoIngestSiteToken: () => null,
  }));
  mock.module("@notra/geo-core/ingest/sites", () => ({
    invalidateIngestSiteCaches: async () => {},
  }));
  const { deleteOrganizationSites } = await import("../src/organization");

  beforeEach(async () => {
    objects.clear();
    removedProviders.length = 0;
    suspended.length = 0;
    failWrite = false;
    failPrefix = false;
    onWrite = async () => {};
    process.env.SITES_HOSTING_DOMAIN = "notra.site";
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
}
