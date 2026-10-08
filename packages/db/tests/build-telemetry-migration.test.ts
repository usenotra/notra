import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("telemetry remains deployment-owned within the consolidated Sites migration", () => {
  const prior = JSON.parse(
    readFileSync(
      new URL("../migrations/meta/0111_snapshot.json", import.meta.url),
      "utf8"
    )
  );
  const current = JSON.parse(
    readFileSync(
      new URL("../migrations/meta/0112_snapshot.json", import.meta.url),
      "utf8"
    )
  );
  const migration = readFileSync(
    new URL("../migrations/0112_sites.sql", import.meta.url),
    "utf8"
  );
  expect(current.prevId).toBe(prior.id);
  const telemetry = current.tables["public.site_build_telemetry"];
  expect(
    Object.keys(current.tables)
      .filter((name) => !Object.hasOwn(prior.tables, name))
      .sort()
  ).toEqual([
    "public.site_build_telemetry",
    "public.site_deployments",
    "public.site_domains",
    "public.site_drafts",
    "public.site_jobs",
    "public.site_slug_grants",
    "public.site_webhook_deliveries",
    "public.sites",
  ]);
  expect(telemetry.columns.deployment_id.primaryKey).toBe(true);
  expect(telemetry.columns.metrics.type).toBe("jsonb");
  expect(telemetry.columns.log.type).toBe("text");
  expect(Object.keys(telemetry.indexes)).toEqual([]);
  expect(Object.values(telemetry.foreignKeys)).toEqual([
    expect.objectContaining({
      tableTo: "site_deployments",
      columnsFrom: ["deployment_id"],
      columnsTo: ["id"],
      onDelete: "cascade",
    }),
  ]);
  expect(migration.match(/CREATE TABLE/g)).toHaveLength(8);
  expect(migration).toContain('CREATE TABLE "site_build_telemetry"');
  expect(migration).toContain(
    'REFERENCES "public"."site_deployments"("id") ON DELETE cascade'
  );
  const journal = JSON.parse(
    readFileSync(
      new URL("../migrations/meta/_journal.json", import.meta.url),
      "utf8"
    )
  );
  expect(journal.entries[112]).toMatchObject({
    idx: 112,
    tag: "0112_sites",
  });
});
