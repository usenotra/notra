import { afterAll, expect, mock, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { siteDeployments, sites } from "@notra/db/schema";
import { drizzle } from "drizzle-orm/pglite";

import { GEO_INGEST_SITE_CACHE_PREFIX } from "../src/constants/geo";
import { isServedBySite } from "../src/utils/ingest-sites";

const postgres = new PGlite();
const database = drizzle(postgres, { schema: { sites, siteDeployments } });
const cache = new Map<string, unknown>();
mock.module("@notra/db/drizzle", () => ({ db: database }));
mock.module("@notra/ai/utils/redis", () => ({
  redis: {
    get: async (key: string) => cache.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      cache.set(key, value);
    },
    del: async (...keys: string[]) => {
      for (const key of keys) {
        cache.delete(key);
      }
    },
  },
}));

const {
  invalidateIngestSiteCaches,
  loadIngestSite,
  loadOrganizationSitePrefixes,
} = await import("../src/ingest/sites");

await postgres.exec(`
  CREATE TABLE sites (
    id text PRIMARY KEY,
    organization_id text NOT NULL,
    project_id text,
    public_origin text NOT NULL,
    status text NOT NULL,
    analytics_enabled boolean NOT NULL DEFAULT true,
    mounts jsonb NOT NULL,
    active_production_deployment_id text
  );
  CREATE TABLE site_deployments (id text PRIMARY KEY, site_id text NOT NULL, kind text NOT NULL, target jsonb NOT NULL);
  INSERT INTO site_deployments VALUES
    ('dep-a', 'site-a', 'production', '{"publicOrigin":"https://example.com","mounts":{"blog":"/blog"}}'),
    ('dep-a-new', 'site-a', 'production', '{"publicOrigin":"https://new.com","mounts":{"blog":"/news"}}'),
    ('dep-b', 'site-b', 'production', '{"publicOrigin":"https://other.com","mounts":{"blog":"/"}}'),
    ('dep-off', 'site-off', 'production', '{"publicOrigin":"https://off.com","mounts":{"blog":"/"}}'),
    ('dep-preview', 'site-preview', 'preview', '{"publicOrigin":"https://preview.com","mounts":{"blog":"/"}}');
  INSERT INTO sites (id, organization_id, project_id, public_origin, status, mounts, active_production_deployment_id) VALUES
    ('site-a', 'org-a', 'project-a', 'https://example.com', 'active', '{"blog":"/blog"}', 'dep-a'),
    ('site-b', 'org-b', 'project-b', 'https://other.com', 'active', '{"blog":"/"}', 'dep-b'),
    ('site-off', 'org-a', 'project-a', 'https://off.com', 'suspended', '{"blog":"/"}', 'dep-off'),
    ('site-empty', 'org-a', 'project-a', 'https://empty.com', 'active', '{"blog":"/"}', NULL),
    ('site-foreign', 'org-a', 'project-a', 'https://foreign.com', 'active', '{"blog":"/"}', 'dep-b'),
    ('site-preview', 'org-a', 'project-a', 'https://preview.com', 'active', '{"blog":"/"}', 'dep-preview');
`);
afterAll(() => postgres.close());

test("cached site suspension and resumption refresh identity and scoped prefixes", async () => {
  const initial = [{ host: "example.com", mounts: ["/blog"] }];
  expect(await loadOrganizationSitePrefixes("org-a")).toEqual(initial);
  expect(await loadIngestSite("site-a")).toMatchObject({ id: "site-a" });
  const other = await loadOrganizationSitePrefixes("org-b");
  expect(other).toEqual([{ host: "other.com", mounts: ["/"] }]);
  expect(isServedBySite(new URL("https://example.com/blog/a"), initial)).toBe(
    true
  );
  expect(isServedBySite(new URL("https://example.com/blogroll"), initial)).toBe(
    false
  );

  await postgres.exec(
    "UPDATE sites SET status = 'suspended' WHERE id = 'site-a'"
  );
  await invalidateIngestSiteCaches("site-a", "org-a");
  const suspended = await loadOrganizationSitePrefixes("org-a");
  expect(suspended).toEqual([]);
  expect(await loadIngestSite("site-a")).toBeNull();
  expect(
    isServedBySite(new URL("https://example.com/blog/a"), suspended ?? [])
  ).toBe(false);
  expect(await loadOrganizationSitePrefixes("org-b")).toBe(other);

  await postgres.exec("UPDATE sites SET status = 'active' WHERE id = 'site-a'");
  await invalidateIngestSiteCaches("site-a", "org-a");
  expect(await loadOrganizationSitePrefixes("org-a")).toEqual(initial);
  expect(await loadIngestSite("site-a")).toMatchObject({ id: "site-a" });

  await postgres.exec(`UPDATE sites SET public_origin = 'https://new.com',
    mounts = '{"blog":"/news"}' WHERE id = 'site-a'`);
  await invalidateIngestSiteCaches("site-a", "org-a");
  expect(await loadOrganizationSitePrefixes("org-a")).toEqual(initial);
  expect(await loadIngestSite("site-a")).toMatchObject({
    hosts: ["example.com"],
    mounts: ["/blog"],
  });

  await postgres.exec(
    "UPDATE sites SET active_production_deployment_id = 'dep-a-new' WHERE id = 'site-a'"
  );
  expect(cache.has(`${GEO_INGEST_SITE_CACHE_PREFIX}:site-a`)).toBe(true);
  await invalidateIngestSiteCaches("site-a", "org-a");
  expect(cache.has(`${GEO_INGEST_SITE_CACHE_PREFIX}:site-a`)).toBe(false);
  expect(await loadOrganizationSitePrefixes("org-a")).toEqual([
    { host: "new.com", mounts: ["/news"] },
  ]);
  expect(await loadIngestSite("site-a")).toMatchObject({ hosts: ["new.com"] });

  await postgres.exec(
    "UPDATE sites SET active_production_deployment_id = 'dep-a', project_id = 'project-new' WHERE id = 'site-a'"
  );
  await invalidateIngestSiteCaches("site-a", "org-a");
  expect(await loadOrganizationSitePrefixes("org-a")).toEqual(initial);
  expect(await loadIngestSite("site-a")).toMatchObject({
    hosts: ["example.com"],
    projectId: "project-new",
  });
});

test("unbuilt, foreign and preview pointers do not claim ingest ownership or suppress SDK traffic", async () => {
  cache.set("geo:ingest-site:v1:site-empty", {
    value: {
      id: "site-empty",
      organizationId: "org-a",
      projectId: "project-a",
      hosts: ["empty.com"],
    },
  });
  cache.set("geo:ingest-organization-sites:v1:org-a", {
    value: [{ host: "empty.com", mounts: ["/"] }],
  });
  for (const id of ["site-empty", "site-foreign", "site-preview", "site-off"]) {
    expect(await loadIngestSite(id)).toBeNull();
  }
  const prefixes = await loadOrganizationSitePrefixes("org-a");
  expect(
    isServedBySite(new URL("https://empty.com/page"), prefixes ?? [])
  ).toBe(false);
  expect(
    isServedBySite(new URL("https://preview.com/page"), prefixes ?? [])
  ).toBe(false);
});

test("turning analytics off invalidates the site token right away", async () => {
  await postgres.exec("UPDATE sites SET status = 'active' WHERE id = 'site-b'");
  await invalidateIngestSiteCaches("site-b", "org-b");
  expect(await loadIngestSite("site-b")).toMatchObject({ id: "site-b" });
  await postgres.exec(
    "UPDATE sites SET analytics_enabled = false WHERE id = 'site-b'"
  );
  await invalidateIngestSiteCaches("site-b", "org-b");
  expect(await loadIngestSite("site-b")).toBeNull();
});
