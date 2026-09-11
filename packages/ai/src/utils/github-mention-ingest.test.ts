import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createHmac } from "node:crypto";

const resolveGitHubMentionContext = mock();
const processGitHubMention = mock();

mock.module("@notra/ai/utils/github-mention-process", () => ({
  resolveGitHubMentionContext,
  processGitHubMention,
}));

const { ingestGitHubAppMentionWebhook } =
  await import("./github-mention-ingest");

const secret = "test-github-app-webhook-secret";

function sign(body: string) {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

const mentionPayload = JSON.stringify({
  action: "created",
  comment: {
    id: 1,
    body: "@notra shorten the intro",
    html_url: "https://github.com/acme/app/pull/42#issuecomment-1",
  },
  issue: {
    number: 42,
    pull_request: { url: "https://api.github.com/repos/acme/app/pulls/42" },
  },
  repository: {
    id: 99,
    name: "app",
    full_name: "acme/app",
    default_branch: "main",
    owner: { login: "acme" },
  },
  sender: { id: 7, login: "alice", type: "User" },
  installation: { id: 55 },
});

describe("ingestGitHubAppMentionWebhook", () => {
  beforeEach(() => {
    process.env.GITHUB_APP_WEBHOOK_SECRET = secret;
    resolveGitHubMentionContext.mockReset();
    processGitHubMention.mockReset();
  });

  test("answers GitHub pings", async () => {
    const result = await ingestGitHubAppMentionWebhook({
      event: "ping",
      signature: null,
      deliveryId: "ping-1",
      rawBody: "{}",
    });
    expect(result.httpStatus).toBe(200);
    expect(result.body.message).toBe(
      "Pong! GitHub App mention webhook configured"
    );
    expect(result.run).toBeUndefined();
  });

  test("ignores non-comment events", async () => {
    const result = await ingestGitHubAppMentionWebhook({
      event: "push",
      signature: sign("{}"),
      deliveryId: "push-1",
      rawBody: "{}",
    });
    expect(result).toMatchObject({
      httpStatus: 200,
      body: { ignored: true, event: "push" },
    });
    expect(result.run).toBeUndefined();
  });

  test("rejects invalid signatures", async () => {
    const result = await ingestGitHubAppMentionWebhook({
      event: "issue_comment",
      signature: "sha256=deadbeef",
      deliveryId: "bad-sig",
      rawBody: mentionPayload,
    });
    expect(result.httpStatus).toBe(401);
  });

  test("returns 200 without running for unauthorized mentions", async () => {
    resolveGitHubMentionContext.mockResolvedValue({
      status: "unauthorized",
      reason: "not_org_member",
    });
    const result = await ingestGitHubAppMentionWebhook({
      event: "issue_comment",
      signature: sign(mentionPayload),
      deliveryId: "unauth-1",
      rawBody: mentionPayload,
    });
    expect(result.httpStatus).toBe(200);
    expect(result.body).toMatchObject({
      message: "unauthorized",
      reason: "not_org_member",
    });
    expect(result.run).toBeUndefined();
  });

  test("accepts authorized mentions for background processing", async () => {
    resolveGitHubMentionContext.mockResolvedValue({
      status: "ready",
      context: { organizationId: "org_1", issueNumber: 42 },
    });
    const result = await ingestGitHubAppMentionWebhook({
      event: "issue_comment",
      signature: sign(mentionPayload),
      deliveryId: "ok-1",
      rawBody: mentionPayload,
    });
    expect(result.httpStatus).toBe(202);
    expect(result.body).toMatchObject({
      message: "accepted",
      organizationId: "org_1",
      issue: 42,
    });
    expect(result.run).toBeTypeOf("function");
  });
});
