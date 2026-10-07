import { beforeEach, expect, mock, test } from "bun:test";
import { createHmac } from "node:crypto";

import { encryptToken } from "@notra/ai/crypto/token-encryption";
import type { getGitHubWebhookIntegrations } from "@notra/ai/integrations/github-webhooks";

import type { WebhookIntegrationAccess } from "../../src/types/webhooks/webhooks";

process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
const secret = "synthetic-webhook-secret";
const encryptedSecret = encryptToken(secret);
const integration = {
  id: "repo",
  organizationId: "org",
  enabled: true,
  encryptedWebhookSecret: encryptedSecret,
};
let records: Awaited<ReturnType<typeof getGitHubWebhookIntegrations>> = [
  integration,
];
const query = mock(async () => records);
const log = mock(async () => undefined);
const fetchLinear = mock(
  async (): Promise<WebhookIntegrationAccess | null> => ({
    organizationId: "org",
    enabled: true,
  })
);
const linearSecret = mock(async () => secret);
mock.module("@notra/db/drizzle", () => ({ db: {} }));
mock.module("@notra/ai/integrations/github-webhooks", () => ({
  getGitHubWebhookIntegrations: query,
}));
mock.module("@notra/ai/integrations/linear", () => ({
  getLinearIntegrationById: fetchLinear,
  getDecryptedLinearWebhookSecret: linearSecret,
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

const { POST } =
  await import("../../src/app/api/webhooks/[provider]/[organizationId]/[integrationId]/[repositoryId]/route");

beforeEach(() => {
  records = [integration];
  query.mockClear();
  log.mockClear();
  fetchLinear.mockClear();
  linearSecret.mockClear();
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

test("signed ping decrypts the loaded secret and performs one lookup", async () => {
  const signature = `sha256=${createHmac("sha256", secret).update("{}").digest("hex")}`;
  const response = await send(undefined, {
    "x-github-event": "ping",
    "x-hub-signature-256": signature,
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ event: "ping" });
  expect(query).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledWith("repo", "repo");
});

test("missing integration or repository and mismatched repository keep their responses", async () => {
  for (const [rows, repositoryId, status, error] of [
    [[], "repo", 404, "Integration not found"],
    [[integration], "missing", 404, "Repository not found"],
    [
      [
        integration,
        { ...integration, id: "other", organizationId: "other-org" },
      ],
      "other",
      403,
      "Repository does not belong to this integration",
    ],
  ] as const) {
    records = [...rows];
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
  records = [{ ...integration, organizationId: "other-org" }];
  expect((await send()).status).toBe(403);
  records = [{ ...integration, enabled: false }];
  expect((await send()).status).toBe(403);
  expect(log).not.toHaveBeenCalled();
});

test("integration access errors take precedence over repository errors", async () => {
  const params = {
    provider: "github",
    organizationId: "org",
    integrationId: "repo",
    repositoryId: "missing",
  };
  records = [{ ...integration, organizationId: "other-org", enabled: false }];
  expect(await (await send(params)).json()).toEqual({
    error: "Integration does not belong to this organization",
  });
  records = [{ ...integration, enabled: false }];
  expect(await (await send(params)).json()).toEqual({
    error: "Integration is disabled",
  });
});

test("missing event, missing secret, missing signature and invalid signature preserve errors", async () => {
  expect((await send()).status).toBe(400);
  records = [{ ...integration, encryptedWebhookSecret: null }];
  expect((await send(undefined, { "x-github-event": "ping" })).status).toBe(
    400
  );
  records = [integration];
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
  records = [{ ...integration, encryptedWebhookSecret: "not-encrypted" }];
  const response = await send(undefined, {
    "x-github-event": "synthetic-unsupported",
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ignored: true });
});

test("invalid parameters and unsupported providers do not query", async () => {
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
  expect(query).not.toHaveBeenCalled();
  expect(fetchLinear).not.toHaveBeenCalled();
});

test("Linear retains access checks and its actual signature handler", async () => {
  const params = {
    provider: "linear",
    organizationId: "org",
    integrationId: "repo",
    repositoryId: "unused-by-linear",
  };
  fetchLinear.mockResolvedValueOnce(null);
  expect((await send(params)).status).toBe(404);
  fetchLinear.mockResolvedValueOnce({ organizationId: "other", enabled: true });
  expect((await send(params)).status).toBe(403);
  fetchLinear.mockResolvedValueOnce({ organizationId: "org", enabled: false });
  expect((await send(params)).status).toBe(403);
  expect((await send(params)).status).toBe(400);
  expect(linearSecret).not.toHaveBeenCalled();

  const body = JSON.stringify({ action: "create", type: "Issue" });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  const response = await send(params, { "linear-signature": signature }, body);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: "Received Linear webhook" });
  expect(query).not.toHaveBeenCalled();
  expect(linearSecret).toHaveBeenCalledTimes(1);
});

test("both providers reject unauthorized requests before reading the body", async () => {
  for (const provider of ["github", "linear"]) {
    const request = new Request("https://fixture.invalid", {
      method: "POST",
      body: "{}",
    });
    const readBody = mock(async () => {
      throw new Error("Must not read unauthorized body");
    });
    Object.defineProperty(request, "text", { value: readBody });
    const response = await POST(request, {
      params: Promise.resolve({
        provider,
        organizationId: "other",
        integrationId: "repo",
        repositoryId: "repo",
      }),
    });
    expect(response.status).toBe(403);
    expect(readBody).not.toHaveBeenCalled();
  }
  expect(fetchLinear).toHaveBeenCalledTimes(1);
});

test("lookup failures still use the route's error boundary", async () => {
  query.mockRejectedValueOnce(new Error("Synthetic lookup failure"));
  const response = await send();
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    error: "Internal server error processing webhook",
  });
});
