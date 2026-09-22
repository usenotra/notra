import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createHmac } from "node:crypto";

const resolveGitHubMentionContext = mock();
const processGitHubMention = mock();
const closeContentPublicationForPullRequest = mock();
const findOpenContentPublicationByPullRequest = mock();
const getGitHubPublishToken = mock();
const syncPublishedPostFromPullRequestHead = mock();

mock.module("@notra/ai/utils/redis", () => ({
  redis: { set: async () => "OK", del: async () => 1 },
}));

mock.module("@notra/ai/utils/github-mention-context", () => ({
  resolveGitHubMentionContext,
}));
mock.module("@notra/ai/utils/github-mention-process", () => ({
  processGitHubMention,
}));
mock.module("@notra/ai/utils/content-publication", () => ({
  closeContentPublicationForPullRequest,
  findOpenContentPublicationByPullRequest,
}));
mock.module("@notra/ai/integrations/github-publish-auth", () => ({
  getGitHubPublishToken,
}));
mock.module("@notra/ai/utils/octokit", () => ({
  createOctokit: () => ({ mocked: true }),
}));
mock.module("@notra/ai/utils/update-published-content", () => ({
  syncPublishedPostFromPullRequestHead,
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
    findOpenContentPublicationByPullRequest.mockReset();
    getGitHubPublishToken.mockReset();
    syncPublishedPostFromPullRequestHead.mockReset();
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

  test("copies an applied suggestion into the Notra post", async () => {
    findOpenContentPublicationByPullRequest.mockResolvedValue({
      id: "pub",
      organizationId: "org_1",
      postId: "post_1",
      repositoryId: "int_1",
      path: "docs/release.md",
      owner: "acme",
      repo: "app",
      headSha: "abc",
      markdown: "# Old",
    });
    getGitHubPublishToken.mockResolvedValue("token");
    syncPublishedPostFromPullRequestHead.mockResolvedValue({
      status: "synchronized",
      markdown: "# Applied",
    });
    const body = JSON.stringify({
      action: "synchronize",
      pull_request: {
        number: 42,
        title: "docs: add release",
        html_url: "https://github.com/acme/app/pull/42",
        merged: false,
        head: { ref: "notra/changelog", sha: "applied" },
        base: { ref: "main", sha: "def" },
      },
      repository: {
        id: 99,
        name: "app",
        full_name: "acme/app",
        default_branch: "main",
        owner: { login: "acme" },
      },
      installation: { id: 55 },
    });
    const result = await ingest("pull_request", body, "pr-sync-1");
    expect(result).toMatchObject({
      httpStatus: 200,
      body: { message: "publication_synced", status: "synchronized" },
    });
    expect(getGitHubPublishToken).toHaveBeenCalledWith("int_1", {
      organizationId: "org_1",
    });
    expect(syncPublishedPostFromPullRequestHead).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        commitSha: "applied",
        branch: "notra/changelog",
      })
    );
    expect(closeContentPublicationForPullRequest).not.toHaveBeenCalled();
    expect(resolveGitHubMentionContext).not.toHaveBeenCalled();
  });

  test("parses a GitHub synchronize payload that includes extra webhook fields", async () => {
    findOpenContentPublicationByPullRequest.mockResolvedValue({
      id: "pub",
      organizationId: "org_1",
      postId: "post_1",
      repositoryId: "int_1",
      path: "docs/release.md",
      owner: "Acme",
      repo: "App",
      headSha: "abc",
      markdown: "# Old",
    });
    getGitHubPublishToken.mockResolvedValue("token");
    syncPublishedPostFromPullRequestHead.mockResolvedValue({
      status: "synchronized",
      markdown: "# Applied",
    });
    // GitHub's documented payload is much larger than our schema. Extra keys
    // (before/after, nested user objects, organization) must not 400.
    const body = JSON.stringify({
      action: "synchronize",
      number: 42,
      before: "abc",
      after: "applied",
      organization: { login: "acme", id: 1 },
      sender: {
        id: 7,
        login: "alice",
        type: "User",
        avatar_url: "https://avatars.githubusercontent.com/u/7",
        site_admin: false,
      },
      pull_request: {
        url: "https://api.github.com/repos/acme/app/pulls/42",
        id: 99,
        node_id: "PR_kw",
        number: 42,
        title: "docs: add release",
        html_url: "https://github.com/acme/app/pull/42",
        body: "Apply the suggestion.",
        draft: false,
        merged: false,
        merged_at: null,
        labels: [],
        user: { login: "alice", id: 7, type: "User", site_admin: false },
        head: {
          label: "acme:notra/changelog",
          ref: "notra/changelog",
          sha: "applied",
          user: { login: "acme", id: 1, type: "Organization" },
          repo: {
            id: 99,
            name: "app",
            full_name: "acme/app",
            private: false,
            owner: { login: "acme" },
          },
        },
        base: {
          label: "acme:main",
          ref: "main",
          sha: "def",
          repo: { full_name: "acme/app" },
        },
      },
      repository: {
        id: 99,
        name: "app",
        full_name: "acme/app",
        private: false,
        html_url: "https://github.com/acme/app",
        default_branch: "main",
        owner: {
          login: "acme",
          id: 1,
          node_id: "MDEyOk9yZw",
          type: "Organization",
          avatar_url: "https://avatars.githubusercontent.com/u/1",
        },
      },
      installation: { id: 55, node_id: "MDIzOkluc3RhbGxhdGlvbjU1" },
    });
    const result = await ingest("pull_request", body, "pr-sync-extra");
    expect(result).toMatchObject({
      httpStatus: 200,
      body: { message: "publication_synced", status: "synchronized" },
    });
    expect(findOpenContentPublicationByPullRequest).toHaveBeenCalledWith({
      owner: "acme",
      repo: "app",
      pullRequestNumber: 42,
      installationId: "55",
      githubRepositoryId: "99",
    });
    expect(syncPublishedPostFromPullRequestHead).toHaveBeenCalledWith(
      expect.objectContaining({
        commitSha: "applied",
        branch: "notra/changelog",
      })
    );
  });

  test("ignores a pull request head update with no linked publication", async () => {
    findOpenContentPublicationByPullRequest.mockResolvedValue(null);
    const body = JSON.stringify({
      action: "synchronize",
      pull_request: {
        number: 42,
        title: "docs: add release",
        html_url: "https://github.com/acme/app/pull/42",
        merged: false,
        head: { ref: "notra/changelog", sha: "applied" },
        base: { ref: "main", sha: "def" },
      },
      repository: {
        id: 99,
        name: "app",
        full_name: "acme/app",
        default_branch: "main",
        owner: { login: "acme" },
      },
      installation: { id: 55 },
    });
    expect(await ingest("pull_request", body, "pr-sync-none")).toMatchObject({
      httpStatus: 200,
      body: { message: "ignored", reason: "no_publication" },
    });
    expect(syncPublishedPostFromPullRequestHead).not.toHaveBeenCalled();
  });

  test("ignores a synchronize delivery without an installation", async () => {
    const body = JSON.stringify({
      action: "synchronize",
      pull_request: {
        number: 42,
        title: "docs: add release",
        html_url: "https://github.com/acme/app/pull/42",
        merged: false,
        head: { ref: "notra/changelog", sha: "applied" },
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
    expect(
      await ingest("pull_request", body, "pr-sync-no-install")
    ).toMatchObject({
      httpStatus: 200,
      body: { message: "ignored", reason: "missing_payload_fields" },
    });
    expect(findOpenContentPublicationByPullRequest).not.toHaveBeenCalled();
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
    expect(result.context).toBeUndefined();
    expect(result.log).toBeUndefined();
  });

  test("rejects a mention without a delivery ID before resolving context", async () => {
    const result = await ingestGitHubAppMentionWebhook({
      event: "issue_comment",
      rawBody: mentionPayload,
      signature: sign(mentionPayload),
      deliveryId: null,
    });
    expect(result.httpStatus).toBe(400);
    expect(resolveGitHubMentionContext).not.toHaveBeenCalled();
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
    expect(result.context).toBeDefined();
    expect(processGitHubMention).not.toHaveBeenCalled();
    // Admission never claims a delivery: if enqueue fails or the request dies,
    // another request can still hand it to the durable worker.
    expect(
      (await ingest("issue_comment", mentionPayload, "ok-1")).httpStatus
    ).toBe(202);
    expect(result.log).toMatchObject({
      status: "pending",
      title: "@notra mention on acme/app#42",
    });
  });
});
