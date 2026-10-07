import { beforeEach, expect, mock, test } from "bun:test";
import { createHmac } from "node:crypto";

import { encryptToken } from "@notra/ai/crypto/token-encryption";
import { drizzle } from "drizzle-orm/node-postgres";

process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
const secret = "synthetic-webhook-secret";
const encryptedSecret = encryptToken(secret);
let records: (string | boolean | null)[][] = [
  ["repo", "org", true, encryptedSecret],
];
const query = mock(async () => ({ rows: records }));
const log = mock(async () => undefined);
const linear = mock(async () => Response.json({ provider: "linear" }));
const fetchLinear = mock(async () => ({
  organizationId: "org",
  enabled: true,
}));
mock.module("@notra/db/drizzle", () => ({
  db: drizzle({ client: { query } as never }),
}));
mock.module("@notra/ai/integrations/linear", () => ({
  getLinearIntegrationById: fetchLinear,
}));
mock.module("@notra/ai/utils/redis", () => ({ redis: null }));
mock.module("@notra/ai/utils/server-log", () => ({ logError: mock() }));
mock.module("@/lib/webhooks/logging", () => ({ appendWebhookLog: log }));
mock.module("@/lib/billing/check-log-retention", () => ({
  checkLogRetention: async () => 7,
}));
mock.module("@/lib/iris/record-github-signal", () => ({
  dispatchIrisGithubSignal: mock(),
}));
mock.module("@/lib/webhooks/dispatch-event-triggers", () => ({
  dispatchEventTriggers: mock(),
}));
mock.module("@/lib/webhooks/linear", () => ({ handleLinearWebhook: linear }));

const { POST } =
  await import("../../src/app/api/webhooks/[provider]/[organizationId]/[integrationId]/[repositoryId]/route");

beforeEach(() => {
  records = [["repo", "org", true, encryptedSecret]];
  query.mockClear();
  log.mockClear();
  linear.mockClear();
  fetchLinear.mockClear();
});

async function send(
  params = {
    provider: "github",
    organizationId: "org",
    integrationId: "repo",
    repositoryId: "repo",
  },
  headers: Record<string, string> = {},
  body = "{}"
) {
  return await POST(
    new Request("https://fixture.invalid", { method: "POST", headers, body }),
    { params: Promise.resolve(params) }
  );
}

test("signed ping decrypts the existing secret and loads only four columns once", async () => {
  const signature = `sha256=${createHmac("sha256", secret).update("{}").digest("hex")}`;
  const response = await send(undefined, {
    "x-github-event": "ping",
    "x-hub-signature-256": signature,
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ event: "ping" });
  expect(query).toHaveBeenCalledTimes(1);
  expect(query.mock.calls[0]).toMatchObject([
    {
      text: 'select "id", "organization_id", "enabled", "encrypted_webhook_secret" from "github_integrations" where "github_integrations"."id" in ($1)',
    },
    ["repo"],
  ]);
});

test("missing integration or repository and mismatched repository keep their responses", async () => {
  for (const [rows, repositoryId, status, error] of [
    [[], "repo", 404, "Integration not found"],
    [
      [["repo", "org", true, encryptedSecret]],
      "missing",
      404,
      "Repository not found",
    ],
    [
      [
        ["repo", "org", true, encryptedSecret],
        ["other", "other-org", true, encryptedSecret],
      ],
      "other",
      403,
      "Repository does not belong to this integration",
    ],
  ] as const) {
    records = rows.map((row) => [...row]);
    const response = await send({
      provider: "github",
      organizationId: "org",
      integrationId: "repo",
      repositoryId,
    });
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
  }
  expect(query).toHaveBeenCalledTimes(3);
});

test("cross-organization and disabled integrations are rejected before handling", async () => {
  records = [["repo", "other-org", true, encryptedSecret]];
  expect((await send()).status).toBe(403);
  records = [["repo", "org", false, encryptedSecret]];
  expect((await send()).status).toBe(403);
  expect(log).not.toHaveBeenCalled();
});

test("missing event, missing secret, missing signature and invalid signature preserve errors", async () => {
  expect((await send()).status).toBe(400);
  records = [["repo", "org", true, null]];
  expect((await send(undefined, { "x-github-event": "ping" })).status).toBe(
    400
  );
  records = [["repo", "org", true, encryptedSecret]];
  expect((await send(undefined, { "x-github-event": "ping" })).status).toBe(
    400
  );
  expect(
    (
      await send(undefined, {
        "x-github-event": "ping",
        "x-hub-signature-256": `sha256=${"0".repeat(64)}`,
      })
    ).status
  ).toBe(401);
  expect(query).toHaveBeenCalledTimes(4);
});

test("unsupported GitHub event still returns ignored without decryption", async () => {
  records = [["repo", "org", true, "not-encrypted"]];
  const response = await send(undefined, {
    "x-github-event": "synthetic-unsupported",
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ignored: true });
});

test("invalid parameters and unsupported providers do not query; Linear stays unchanged", async () => {
  expect(
    (
      await send({
        provider: "github",
        organizationId: "",
        integrationId: "repo",
        repositoryId: "repo",
      })
    ).status
  ).toBe(400);
  expect(
    (
      await send({
        provider: "slack",
        organizationId: "org",
        integrationId: "repo",
        repositoryId: "repo",
      })
    ).status
  ).toBe(501);
  expect(
    (
      await send({
        provider: "linear",
        organizationId: "org",
        integrationId: "repo",
        repositoryId: "repo",
      })
    ).status
  ).toBe(200);
  expect(query).not.toHaveBeenCalled();
  expect(fetchLinear).toHaveBeenCalledTimes(1);
  expect(linear).toHaveBeenCalledTimes(1);
});
