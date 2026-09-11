import { describe, expect, test } from "bun:test";

import type { GitHubMentionContext } from "@notra/ai/types/github-mention";

import {
  buildAcceptedMentionWebhookLog,
  buildMentionResultWebhookLog,
  buildUnauthorizedMentionWebhookLog,
  snippetForGitHubMentionLog,
} from "./github-mention-log";

const context: GitHubMentionContext = {
  deliveryId: "del-1",
  installationId: "55",
  organizationId: "org_1",
  userId: "user_1",
  integrationId: "int_1",
  owner: "acme",
  repo: "app",
  issueNumber: 42,
  comment: {
    id: 1,
    body: "@notra shorten the intro",
    htmlUrl: "https://github.com/acme/app/pull/42#issuecomment-1",
  },
  sender: { id: 7, login: "alice", type: "User" },
  pullRequest: {
    number: 42,
    title: "docs: changelog",
    body: null,
    htmlUrl: "https://github.com/acme/app/pull/42",
    headRef: "notra/changelog-abc",
    headSha: "abc123",
    baseRef: "main",
    draft: true,
  },
  destination: {
    mode: "same_pull_request",
    pullRequestNumber: 42,
    headRef: "notra/changelog-abc",
    headSha: "abc123",
  },
  publication: {
    id: "pub_1",
    postId: "post_1",
    repositoryId: "int_1",
    owner: "acme",
    repo: "app",
    path: "changelog/entry.mdx",
    branch: "notra/changelog-abc",
    pullRequestNumber: 42,
    pullRequestUrl: "https://github.com/acme/app/pull/42",
    headSha: "abc123",
    status: "open",
    contentType: "changelog",
    title: "Scan scheduling",
    markdown: "# Hello",
  },
};

describe("snippetForGitHubMentionLog", () => {
  test("truncates long comments", () => {
    const snippet = snippetForGitHubMentionLog("a".repeat(400));
    expect(snippet?.endsWith("…")).toBe(true);
    expect(snippet?.length).toBe(281);
  });
});

describe("mention webhook logs", () => {
  test("records an accepted mention as pending", () => {
    const log = buildAcceptedMentionWebhookLog(context);
    expect(log).toMatchObject({
      organizationId: "org_1",
      integrationId: "int_1",
      status: "pending",
      statusCode: 202,
      title: "@notra mention on acme/app#42",
    });
    expect(log.payload).toMatchObject({
      mentionStatus: "accepted",
      repository: "acme/app",
      issueNumber: 42,
      senderLogin: "alice",
      postId: "post_1",
    });
  });

  test("records a commit result as success", () => {
    const log = buildMentionResultWebhookLog({
      context,
      result: {
        status: "committed",
        commitSha: "def456",
        pullRequestUrl: "https://github.com/acme/app/pull/42",
        reply: "Updated the intro.",
      },
      durationMs: 1200,
    });
    expect(log.status).toBe("success");
    expect(log.title).toBe("Updated acme/app#42 from @notra mention");
    expect(log.payload.commitSha).toBe("def456");
    expect(log.payload.durationMs).toBe(1200);
  });

  test("records a failed mention as failed", () => {
    const log = buildMentionResultWebhookLog({
      context,
      result: {
        status: "failed",
        reason: "github_token_unavailable",
      },
      durationMs: 80,
    });
    expect(log.status).toBe("failed");
    expect(log.statusCode).toBe(500);
    expect(log.title).toBe("Failed @notra mention on acme/app#42");
    expect(log.errorMessage).toBe("github_token_unavailable");
  });

  test("records unauthorized mentions as skipped", () => {
    const log = buildUnauthorizedMentionWebhookLog({
      target: {
        organizationId: "org_1",
        integrationId: "int_1",
        owner: "acme",
        repo: "app",
      },
      issueNumber: 42,
      senderLogin: "mallory",
      commentUrl: "https://github.com/acme/app/pull/42#issuecomment-2",
      commentBody: "@notra please rewrite this",
    });
    expect(log.status).toBe("skipped");
    expect(log.errorMessage).toContain("linked organization member");
    expect(log.payload.senderLogin).toBe("mallory");
  });
});
