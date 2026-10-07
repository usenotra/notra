import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.NOTRA_GITHUB_WEBHOOK_QUERY_TEST_WORKER !== "1") {
  test("GitHub webhook lookups execute one narrow query", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_GITHUB_WEBHOOK_QUERY_TEST_WORKER: "1" },
        encoding: "utf8",
        timeout: 25000,
      }
    );
    expect(result.status, result.stderr).toBe(0);
  }, 30000);
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite();
  const logQuery = mock();
  const db = drizzle(client, { logger: { logQuery } });
  mock.module("@notra/db/drizzle", () => ({ db }));
  await client.exec(`
    create table github_integrations (
      id text primary key,
      organization_id text not null,
      enabled boolean not null,
      encrypted_webhook_secret text
    );
    insert into github_integrations values
      ('repo', 'org', true, 'synthetic-encrypted-secret'),
      ('other', 'other-org', false, null);
  `);
  const { getGitHubWebhookIntegrations } = await import("./github-webhooks");
  beforeEach(() => logQuery.mockClear());
  afterAll(() => client.close());

  test("matching IDs select four columns once without relations", async () => {
    expect(await getGitHubWebhookIntegrations("repo", "repo")).toEqual([
      {
        id: "repo",
        organizationId: "org",
        enabled: true,
        encryptedWebhookSecret: "synthetic-encrypted-secret",
      },
    ]);
    expect(logQuery).toHaveBeenCalledTimes(1);
    expect(logQuery.mock.calls[0]).toEqual([
      'select "id", "organization_id", "enabled", "encrypted_webhook_secret" from "github_integrations" where "github_integrations"."id" in ($1)',
      ["repo"],
    ]);
  });

  test("distinct path IDs load both records while missing IDs stay absent", async () => {
    const records = await getGitHubWebhookIntegrations("repo", "other");
    expect(records.map((record) => record.id).sort()).toEqual([
      "other",
      "repo",
    ]);
    expect(records.find((record) => record.id === "other")).toMatchObject({
      enabled: false,
      encryptedWebhookSecret: null,
    });
    expect(logQuery).toHaveBeenCalledTimes(1);
    expect(await getGitHubWebhookIntegrations("repo", "missing")).toHaveLength(
      1
    );
    expect(await getGitHubWebhookIntegrations("missing", "missing")).toEqual(
      []
    );
  });
}
