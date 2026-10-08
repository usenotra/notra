import { afterAll, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { Effect } from "effect";

const databaseUrl = process.env.SITES_TEST_DATABASE_URL;
if (!databaseUrl) {
  test.skip("Site identity project deletion requires synthetic PostgreSQL", () => {});
} else if (process.env.NOTRA_SITE_PROJECT_DELETE_TEST_WORKER !== "1") {
  test("project deletion invalidates site identities before and after nullable FK updates", () => {
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
          NOTRA_SITE_PROJECT_DELETE_TEST_WORKER: "1",
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
  const { brandSettings, organizations, projects, siteDeployments, sites } =
    await import("@notra/db/schema");
  const { eq } = await import("drizzle-orm");
  const cache = new Map<string, unknown>();
  const deletedKeys: string[] = [];
  mock.module("@notra/ai/utils/redis", () => ({
    redis: {
      get: async (key: string) => cache.get(key) ?? null,
      set: async (key: string, value: unknown) => {
        cache.set(key, value);
      },
      del: async (...keys: string[]) => {
        deletedKeys.push(...keys);
        for (const key of keys) {
          cache.delete(key);
        }
      },
    },
  }));
  const { deleteGeoProject } = await import("../src/geo/projects");
  const { loadIngestSite, loadOrganizationSitePrefixes } =
    await import("../src/ingest/sites");
  const { isGeoIngestIdentityActive } = await import("../src/ingest/identity");
  const {
    GEO_INGEST_SITE_CACHE_PREFIX,
    GEO_INGEST_ORGANIZATION_SITES_CACHE_PREFIX,
  } = await import("../src/constants/geo");
  afterAll(async () => {
    await Reflect.get(db, "$client").end();
  });

  test("cached explicit and default project identities resolve the remaining project without changing published coverage", async () => {
    const organizationId = `project-site-${crypto.randomUUID()}`;
    const brandId = `${organizationId}-brand`;
    const oldProjectId = `${organizationId}-old`;
    const remainingProjectId = `${organizationId}-remaining`;
    const ids = [`${organizationId}-assigned`, `${organizationId}-default`];
    try {
      await db.insert(organizations).values({
        id: organizationId,
        name: "Synthetic site projects",
        slug: organizationId,
        createdAt: new Date(),
      });
      await db.insert(brandSettings).values({
        id: brandId,
        organizationId,
        websiteUrl: "https://old.example.test",
      });
      await db.insert(projects).values([
        {
          id: oldProjectId,
          organizationId,
          name: "Old",
          brandSettingsId: brandId,
          createdAt: new Date("2025-01-01"),
        },
        {
          id: remainingProjectId,
          organizationId,
          name: "Remaining",
          brandSettingsId: brandId,
          createdAt: new Date("2025-02-01"),
        },
      ]);
      for (const [index, id] of ids.entries()) {
        await db.insert(sites).values({
          id,
          organizationId,
          projectId: index === 0 ? oldProjectId : null,
          name: "Synthetic site",
          slug: crypto.randomUUID().slice(0, 8),
          publicOrigin: "https://desired.example.test",
          mounts: { blog: "/desired" },
        });
        await db.insert(siteDeployments).values({
          id: `${id}-live`,
          siteId: id,
          organizationId,
          kind: "production",
          trigger: "manual",
          status: "ready",
          generation: 1,
          branch: "main",
          commitSha: "a".repeat(40),
          configHash: "synthetic",
          target: {
            publicOrigin: "https://published.example.test",
            mounts: { blog: "/blog" },
            noindex: false,
            branding: true,
          },
        });
        await db
          .update(sites)
          .set({ activeProductionDeploymentId: `${id}-live` })
          .where(eq(sites.id, id));
        expect(await loadIngestSite(id)).toMatchObject({
          projectId: oldProjectId,
          hosts: ["published.example.test"],
          mounts: ["/blog"],
        });
      }
      const beforePrefixes = await loadOrganizationSitePrefixes(organizationId);
      await Effect.runPromise(deleteGeoProject(organizationId, oldProjectId));
      for (const id of ids) {
        expect(
          deletedKeys.filter(
            (key) => key === `${GEO_INGEST_SITE_CACHE_PREFIX}:${id}`
          )
        ).toHaveLength(2);
        expect(await loadIngestSite(id)).toMatchObject({
          projectId: remainingProjectId,
          hosts: ["published.example.test"],
          mounts: ["/blog"],
        });
        const current = await db.query.sites.findFirst({
          where: eq(sites.id, id),
        });
        expect(current?.projectId).toBeNull();
        expect(current?.activeProductionDeploymentId).toBe(`${id}-live`);
      }
      expect(deletedKeys).toContain(
        `${GEO_INGEST_ORGANIZATION_SITES_CACHE_PREFIX}:${organizationId}`
      );
      expect(await loadOrganizationSitePrefixes(organizationId)).toEqual(
        beforePrefixes
      );
      expect(
        await isGeoIngestIdentityActive({
          organizationId,
          projectId: oldProjectId,
          generation: 0,
          site: {
            id: ids[0] ?? "",
            hosts: ["published.example.test"],
            mounts: ["/blog"],
          },
        })
      ).toBe(false);
      expect(
        await isGeoIngestIdentityActive({
          organizationId,
          projectId: remainingProjectId,
          generation: 0,
          site: {
            id: ids[0] ?? "",
            hosts: ["published.example.test"],
            mounts: ["/blog"],
          },
        })
      ).toBe(true);
    } finally {
      await db
        .delete(organizations)
        .where(eq(organizations.id, organizationId));
    }
  });
}
