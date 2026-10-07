import { afterAll, expect, mock, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { sites } from "@notra/db/schema";
import { drizzle } from "drizzle-orm/pglite";

import { isServedBySite } from "../src/utils/ingest-sites";

const postgres = new PGlite();
const database = drizzle(postgres, { schema: { sites } });
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
    mounts jsonb NOT NULL
  );
  INSERT INTO sites VALUES
    ('site-a', 'org-a', 'project-a', 'https://example.com', 'active', '{"blog":"/blog"}'),
    ('site-b', 'org-b', 'project-b', 'https://other.com', 'active', '{"blog":"/"}'),
    ('site-off', 'org-a', 'project-a', 'https://off.com', 'suspended', '{"blog":"/"}');
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
  expect(await loadOrganizationSitePrefixes("org-a")).toEqual([
    { host: "new.com", mounts: ["/news"] },
  ]);
  expect(await loadIngestSite("site-a")).toMatchObject({ hosts: ["new.com"] });
});
