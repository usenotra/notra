import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { Client } from "pg";

import type { IntegritySnapshot } from "./types/sites-tenant-integrity";
import { expectConstraint } from "./utils/expect-constraint";

const migration = readFileSync(
  new URL("../migrations/0109_sites.sql", import.meta.url),
  "utf8"
);
const statements = migration.split("--> statement-breakpoint");
const firstConstraint = statements.findIndex((statement) =>
  statement.includes("ADD CONSTRAINT")
);
const creation = statements
  .slice(0, firstConstraint)
  .join("--> statement-breakpoint");
const constraints = statements
  .slice(firstConstraint)
  .join("--> statement-breakpoint");
const baseline = readFileSync(
  new URL("fixtures/sites-tenant-integrity.sql", import.meta.url),
  "utf8"
);
const seed = readFileSync(
  new URL("fixtures/sites-tenant-integrity-seed.sql", import.meta.url),
  "utf8"
);
const databaseUrl = process.env.SITES_TEST_DATABASE_URL;

test("new migration creates referenced keys before FKs and matches its snapshot", () => {
  expect(migration).not.toContain("track_visitors");
  expect(migration).not.toContain(
    "site_jobs_deployment_id_site_deployments_id_fk"
  );
  expect(migration).toContain('"revision" integer DEFAULT 0 NOT NULL');
  expect(migration).toContain('"active_production_deployment_id" text');
  const statements = migration.split("--> statement-breakpoint");
  const firstForeignKey = statements.findIndex(
    (statement) =>
      statement.includes("ADD CONSTRAINT") && statement.includes("FOREIGN KEY")
  );
  for (const [position, statement] of statements.entries()) {
    if (statement.includes("CREATE UNIQUE INDEX")) {
      expect(position).toBeLessThan(firstForeignKey);
    }
  }
  const snapshot: IntegritySnapshot = JSON.parse(
    readFileSync(
      new URL("../migrations/meta/0109_snapshot.json", import.meta.url),
      "utf8"
    )
  );
  const priorSnapshot = JSON.parse(
    readFileSync(
      new URL("../migrations/meta/0108_snapshot.json", import.meta.url),
      "utf8"
    )
  );
  expect(snapshot.prevId).toBe(priorSnapshot.id);
  for (const table of Object.values(snapshot.tables)) {
    for (const constraint of Object.values(table.checkConstraints)) {
      if (
        constraint.name.startsWith("site") &&
        constraint.name.endsWith("_check")
      ) {
        expect(migration).toContain(
          `ADD CONSTRAINT "${constraint.name}" CHECK (${constraint.value})`
        );
      }
    }
  }
});

describe.skipIf(!databaseUrl)(
  "Sites tenant constraints on isolated PostgreSQL",
  () => {
    let client: Client;
    let scopedMigration: string;

    beforeEach(async () => {
      const url = new URL(databaseUrl ?? "postgresql://invalid/invalid");
      expect(url.hostname).toBe("127.0.0.1");
      expect(url.pathname).toBe("/notra_server_audit");
      client = new Client({ connectionString: databaseUrl });
      await client.connect();
      await client.query("BEGIN");
      const schema = `sites_integrity_${crypto.randomUUID().replaceAll("-", "")}`;
      await client.query(
        `CREATE SCHEMA "${schema}"; SET LOCAL search_path TO "${schema}"`
      );
      scopedMigration = constraints.replaceAll('"public".', `"${schema}".`);
      await client.query(baseline);
      await client.query(creation.replaceAll('"public".', `"${schema}".`));
      await client.query("SAVEPOINT before_integrity");
      await client.query(scopedMigration);
      await client.query(seed);
    });

    afterEach(async () => {
      if (client) {
        await client.query("ROLLBACK");
        await client.end();
      }
    });

    test("rejects cross-tenant Sites, installations, children and publications", async () => {
      for (const [query, constraint] of [
        [
          "UPDATE sites SET project_id='project-b' WHERE id='site-a'",
          "sites_org_project_fk",
        ],
        [
          "UPDATE sites SET repository_id='repository-b' WHERE id='site-a'",
          "sites_org_repository_fk",
        ],
        [
          "UPDATE github_integrations SET github_app_installation_id='installation-b' WHERE id='repository-a'",
          "githubIntegrations_org_installation_fk",
        ],
        [
          "UPDATE site_domains SET organization_id='b' WHERE id='domain-a'",
          "siteDomains_org_site_fk",
        ],
        [
          "UPDATE site_deployments SET organization_id='b' WHERE id='deployment-a'",
          "siteDeployments_org_site_fk",
        ],
        [
          "UPDATE site_jobs SET deployment_id='deployment-b' WHERE id='job-a'",
          "siteJobs_site_deployment_fk",
        ],
        [
          "UPDATE site_jobs SET deployment_id='deployment-a2' WHERE id='job-a'",
          "siteJobs_site_deployment_fk",
        ],
        [
          "UPDATE content_publications SET post_id='post-b' WHERE id='publication-a'",
          "contentPublications_org_post_fk",
        ],
        [
          "UPDATE content_publications SET repository_id='repository-b' WHERE id='publication-a'",
          "contentPublications_org_repository_fk",
        ],
      ]) {
        await expectConstraint(client, query, constraint);
      }
      await expectConstraint(
        client,
        "INSERT INTO site_domains (id,site_id,organization_id,hostname,kind) VALUES ('bad','site-a','b','bad.example.test','proxy')",
        "siteDomains_org_site_fk"
      );
      await expectConstraint(
        client,
        "INSERT INTO site_jobs (id,site_id,deployment_id,kind) VALUES ('bad','site-a','deployment-b','build')",
        "siteJobs_site_deployment_fk"
      );
      await expectConstraint(
        client,
        "INSERT INTO content_publications VALUES ('bad','a','post-b','repository-a')",
        "contentPublications_org_post_fk"
      );
    });

    test("optional reference deletion preserves the site identity and GitHub snapshot", async () => {
      await client.query(
        "DELETE FROM projects WHERE id='project-a'; DELETE FROM github_integrations WHERE id='repository-a'"
      );
      const { rows } = await client.query(
        "SELECT id,organization_id,project_id,repository_id,github_installation_id,github_repository_id,repository_owner,repository_name FROM sites WHERE id='site-a'"
      );
      expect(rows).toEqual([
        {
          id: "site-a",
          organization_id: "a",
          project_id: null,
          repository_id: null,
          github_installation_id: "snapshot-installation",
          github_repository_id: "snapshot-repository",
          repository_owner: "snapshot-owner",
          repository_name: "snapshot-name",
        },
      ]);
      expect(
        (await client.query("SELECT * FROM content_publications")).rows
      ).toHaveLength(0);
    });

    test("production projection is same-site and deployment deletion nulls only the pointer", async () => {
      await expectConstraint(
        client,
        "UPDATE sites SET active_production_deployment_id='deployment-b' WHERE id='site-a'",
        "sites_active_production_same_site_fk"
      );
      await expectConstraint(
        client,
        "UPDATE sites SET active_production_deployment_id='deployment-a2' WHERE id='site-a'",
        "sites_active_production_same_site_fk"
      );
      await client.query(
        "UPDATE sites SET active_production_deployment_id='deployment-a' WHERE id='site-a'; DELETE FROM site_deployments WHERE id='deployment-a'"
      );
      expect(
        (
          await client.query(
            "SELECT id,organization_id,active_production_deployment_id FROM sites WHERE id='site-a'"
          )
        ).rows
      ).toEqual([
        {
          id: "site-a",
          organization_id: "a",
          active_production_deployment_id: null,
        },
      ]);
      expect(
        (
          await client.query(
            "SELECT id FROM site_jobs WHERE site_id='site-a' ORDER BY id"
          )
        ).rows
      ).toEqual([
        { id: "lease-only" },
        { id: "removal-a" },
        { id: "settings-a" },
      ]);
    });

    test("installation, site and organization cascades preserve other tenants", async () => {
      await client.query(
        "UPDATE sites SET active_production_deployment_id='deployment-b' WHERE id='site-b'; DELETE FROM github_app_installations WHERE id='installation-a'"
      );
      expect(
        (
          await client.query(
            "SELECT repository_id FROM sites WHERE id='site-a'"
          )
        ).rows
      ).toEqual([{ repository_id: null }]);
      expect(
        (await client.query("SELECT id FROM github_integrations ORDER BY id"))
          .rows
      ).toEqual([{ id: "repository-b" }]);
      await client.query("DELETE FROM sites WHERE id='site-a'");
      expect((await client.query("SELECT * FROM site_jobs")).rows).toHaveLength(
        0
      );
      expect(
        (await client.query("SELECT * FROM site_drafts")).rows
      ).toHaveLength(0);
      await client.query("DELETE FROM organizations WHERE id='b'");
      expect(
        (await client.query("SELECT id,organization_id FROM sites")).rows
      ).toEqual([{ id: "site-a2", organization_id: "a" }]);
      expect(
        (await client.query("SELECT id FROM site_deployments")).rows
      ).toEqual([{ id: "deployment-a2" }]);
    });

    test("checks reject invalid states without rejecting pending host claims or deployment-less jobs", async () => {
      for (const [query, constraint] of [
        [
          "UPDATE sites SET status='unknown' WHERE id='site-a'",
          "sites_status_check",
        ],
        [
          "UPDATE sites SET preview_visibility='unknown' WHERE id='site-a'",
          "sites_previewVisibility_check",
        ],
        [
          "UPDATE sites SET publish_mode='unknown' WHERE id='site-a'",
          "sites_publishMode_check",
        ],
        [
          "UPDATE sites SET last_generation=-1 WHERE id='site-a'",
          "sites_lastGeneration_check",
        ],
        [
          "UPDATE site_domains SET kind='unknown' WHERE id='domain-a'",
          "siteDomains_kind_check",
        ],
        [
          "UPDATE site_domains SET status='unknown' WHERE id='domain-a'",
          "siteDomains_status_check",
        ],
        [
          "UPDATE site_deployments SET kind='unknown' WHERE id='deployment-a'",
          "siteDeployments_kind_check",
        ],
        [
          "UPDATE site_deployments SET status='unknown' WHERE id='deployment-a'",
          "siteDeployments_status_check",
        ],
        [
          "UPDATE site_deployments SET trigger='unknown' WHERE id='deployment-a'",
          "siteDeployments_trigger_check",
        ],
        [
          "UPDATE site_deployments SET generation=-1 WHERE id='deployment-a'",
          "siteDeployments_generation_check",
        ],
        [
          "UPDATE site_deployments SET kind='preview' WHERE id='deployment-a'",
          "siteDeployments_previewKey_check",
        ],
        [
          "UPDATE site_deployments SET preview_key='pr-1' WHERE id='deployment-a'",
          "siteDeployments_previewKey_check",
        ],
        [
          "UPDATE site_jobs SET kind='unknown' WHERE id='job-a'",
          "siteJobs_kind_check",
        ],
        [
          "UPDATE site_jobs SET status='unknown' WHERE id='job-a'",
          "siteJobs_status_check",
        ],
        [
          "UPDATE site_jobs SET attempts=-1 WHERE id='job-a'",
          "siteJobs_attempts_check",
        ],
        [
          "UPDATE site_jobs SET max_attempts=-1 WHERE id='job-a'",
          "siteJobs_attempts_check",
        ],
      ]) {
        await expectConstraint(client, query, constraint, "23514");
      }
      await client.query(
        "UPDATE site_deployments SET kind='preview', preview_key='pr-1' WHERE id='deployment-a'"
      );
      await expectConstraint(
        client,
        "UPDATE site_deployments SET preview_key='' WHERE id='deployment-a'",
        "siteDeployments_previewKey_check",
        "23514"
      );
      expect(
        (
          await client.query(
            "SELECT revision FROM site_drafts WHERE id='draft-a'"
          )
        ).rows
      ).toEqual([{ revision: 0 }]);
      expect(
        (
          await client.query(
            "SELECT id FROM site_domains WHERE hostname='shared.example.test'"
          )
        ).rows
      ).toHaveLength(2);
      expect(
        (
          await client.query(
            "SELECT id FROM site_jobs WHERE deployment_id IS NULL"
          )
        ).rows
      ).toHaveLength(3);
    });

    test("migration refuses existing mismatches instead of retargeting or deleting data", async () => {
      await client.query("ROLLBACK TO SAVEPOINT before_integrity");
      await client.query(seed);
      await client.query(
        "UPDATE site_jobs SET deployment_id='deployment-b' WHERE id='job-a'"
      );
      await expectConstraint(
        client,
        scopedMigration,
        "siteJobs_site_deployment_fk"
      );
      expect(
        (
          await client.query(
            "SELECT site_id,deployment_id FROM site_jobs WHERE id='job-a'"
          )
        ).rows
      ).toEqual([{ site_id: "site-a", deployment_id: "deployment-b" }]);
    });
  }
);
