import { beforeEach, describe, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.NOTRA_GITHUB_SYNC_ROUTE_TEST_WORKER !== "1") {
  test("internal GitHub sync regressions (isolated mocks)", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_GITHUB_SYNC_ROUTE_TEST_WORKER: "1" },
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const linkedPublish = {
    repositoryId: "repo_test",
    owner: "notra",
    repo: "blog",
    branchName: "notra/article",
    path: "blog/article.md",
    pullRequestNumber: 42,
    pullRequestUrl: "https://github.com/notra/blog/pull/42",
  };
  const authorize = mock(async () => true);
  const findPost = mock(async (): Promise<unknown> => ({
    contentType: "blog_post",
    githubPublish: linkedPublish,
  }));
  const publish = mock(async () => undefined);
  const subscription = mock(async () => undefined);
  mock.module("@/lib/workflows/internal-auth", () => ({
    verifyInternalWorkflowRequest: authorize,
  }));
  mock.module("@notra/db/drizzle", () => ({
    db: { query: { posts: { findFirst: findPost } } },
  }));
  mock.module("@/lib/integrations/github/publish-saved-content", () => ({
    publishSavedContentToGitHub: publish,
  }));
  mock.module("@/lib/billing/subscription", () => ({
    assertActiveSubscription: subscription,
  }));
  mock.module("@/utils/ratelimit", () => ({
    ratelimit: { githubPublish: { limit: async () => ({ success: true }) } },
  }));

  const { POST } = await import("./route");

  const request = () => {
    return new Request("http://localhost/api/internal/content/sync-github", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId: "org_test", postId: "post_test" }),
    });
  };

  beforeEach(() => {
    authorize.mockResolvedValue(true);
    findPost.mockReset();
    findPost.mockResolvedValue({
      contentType: "blog_post",
      githubPublish: linkedPublish,
    });
    publish.mockReset();
    publish.mockResolvedValue(undefined);
    subscription.mockReset();
    subscription.mockResolvedValue(undefined);
  });

  describe("internal linked PR sync", () => {
    test("rejects unauthenticated calls before reading a post", async () => {
      authorize.mockResolvedValue(false);
      expect((await POST(request())).status).toBe(401);
      expect(findPost).not.toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
    });

    test("uses the stored repository and forbids creating a replacement PR", async () => {
      expect((await POST(request())).status).toBe(200);
      expect(subscription).toHaveBeenCalledWith("org_test");
      expect(publish).toHaveBeenCalledTimes(1);
      expect(publish).toHaveBeenCalledWith({
        organizationId: "org_test",
        contentId: "post_test",
        contentType: "blog_post",
        repositoryId: "repo_test",
        linkedOnly: true,
      });
    });

    test("does not create a PR for unlinked content", async () => {
      findPost.mockResolvedValue({
        contentType: "blog_post",
        githubPublish: null,
      });
      expect((await POST(request())).status).toBe(200);
      expect(publish).not.toHaveBeenCalled();
    });

    test("does not publish a post outside the organization lookup", async () => {
      findPost.mockResolvedValue(undefined);
      expect((await POST(request())).status).toBe(404);
      expect(publish).not.toHaveBeenCalled();
    });

    test("propagates closed PR or GitHub failures without a create fallback", async () => {
      publish.mockRejectedValue(new Error("Linked PR is closed"));
      expect((await POST(request())).status).toBe(502);
      expect(publish).toHaveBeenCalledTimes(1);
    });

    test("enforces the publishing subscription", async () => {
      subscription.mockRejectedValue(new Error("Subscription required"));
      expect((await POST(request())).status).toBe(502);
      expect(publish).not.toHaveBeenCalled();
    });
  });
}
