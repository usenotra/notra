import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createHmac } from "node:crypto";

const resolveGitHubMentionContext = mock();
const processGitHubMention = mock();
const closeContentPublicationForPullRequest = mock();

mock.module("@notra/ai/utils/redis", () => ({
  redis: { set: async () => "OK", del: async () => 1 },
}));

mock.module("@notra/ai/utils/github-mention-process", () => ({
  resolveGitHubMentionContext,
  processGitHubMention,
}));
mock.module("@notra/ai/utils/content-publication", () => ({
  closeContentPublicationForPullRequest,
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

const ingest = (
  event: string,
  rawBody: string,
  deliveryId: string,
  signature: string | null = sign(rawBody)
) => ingestGitHubAppMentionWebhook({ event, signature, deliveryId, rawBody });

describe("ingestGitHubAppMentionWebhook", () => {
  beforeEach(() => {
    process.env.GITHUB_APP_WEBHOOK_SECRET = secret;
    resolveGitHubMentionContext.mockReset();
    processGitHubMention.mockReset();
    closeContentPublicationForPullRequest.mockReset();
  });

  test("marks the publication merged when its pull request closes", async () => {
    closeContentPublicationForPullRequest.mockResolvedValue(1);
    const body = JSON.stringify({
      action: "closed",
      pull_request: {
        number: 42,
        title: "docs: add release",
        html_url: "https://github.com/acme/app/pull/42",
        merged: true,
        head: { ref: "notra/changelog", sha: "abc" },
        base: { ref: "main", sha: "def" },
      },
      repository: {
        id: 99,
        name: "app",
        full_name: "acme/app",
        default_branch: "main",
        owner: { login: "acme" },
      },
    });
    const result = await ingest("pull_request", body, "pr-closed-1");
    expect(result).toMatchObject({
      httpStatus: 200,
      body: { message: "publication_synced", updated: 1 },
    });
    expect(closeContentPublicationForPullRequest).toHaveBeenCalledWith({
      owner: "acme",
      repo: "app",
      pullRequestNumber: 42,
      merged: true,
    });
    expect(resolveGitHubMentionContext).not.toHaveBeenCalled();
  });

  test("rejects invalid signatures", async () => {
    const result = await ingest(
      "issue_comment",
      mentionPayload,
      "bad-sig",
      "sha256=deadbeef"
    );
    expect(result.httpStatus).toBe(401);
  });

  test("ignores ordinary issue mentions before resolving context or starting work", async () => {
    const body = JSON.stringify({
      ...JSON.parse(mentionPayload),
      issue: { number: 42 },
    });
    const result = await ingest("issue_comment", body, "ordinary-issue");
    expect(result).toEqual({
      httpStatus: 200,
      body: { message: "ignored", reason: "not_pull_request" },
    });
    expect(resolveGitHubMentionContext).not.toHaveBeenCalled();
    expect(processGitHubMention).not.toHaveBeenCalled();
  });

  test("returns 200 without running for unauthorized mentions", async () => {
    resolveGitHubMentionContext.mockResolvedValue({
      status: "unauthorized",
      reason: "not_org_member",
    });
    const result = await ingest("issue_comment", mentionPayload, "unauth-1");
    expect(result.httpStatus).toBe(200);
    expect(result.body).toMatchObject({
      message: "unauthorized",
      reason: "not_org_member",
    });
    expect(result.run).toBeUndefined();
    expect(result.log).toBeUndefined();
  });

  test("accepts authorized mentions for background processing", async () => {
    resolveGitHubMentionContext.mockResolvedValue({
      status: "ready",
      context: {
        organizationId: "org_1",
        integrationId: "int_1",
        issueNumber: 42,
        owner: "acme",
        repo: "app",
        sender: { id: 7, login: "alice" },
        destination: { mode: "same_pull_request" },
        publication: { postId: "post_1" },
        comment: {
          htmlUrl: "https://github.com/acme/app/pull/42#issuecomment-1",
          body: "@notra shorten the intro",
        },
        pullRequest: { htmlUrl: "https://github.com/acme/app/pull/42" },
      },
    });
    const result = await ingest("issue_comment", mentionPayload, "ok-1");
    expect(result.httpStatus).toBe(202);
    expect(result.body).toMatchObject({
      message: "accepted",
      organizationId: "org_1",
      issue: 42,
    });
    expect(result.run).toBeTypeOf("function");
    expect(result.log).toMatchObject({
      status: "pending",
      title: "@notra mention on acme/app#42",
    });
  });
});
