import { beforeEach, describe, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createOpenApiApp } from "../src/utils/openapi-app";

if (process.env.NOTRA_API_GITHUB_SYNC_TEST_WORKER !== "1") {
  test("post GitHub sync regressions (isolated mocks)", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_API_GITHUB_SYNC_TEST_WORKER: "1" },
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const actualRatelimit = await import("../src/utils/ratelimit");
  mock.module("../src/utils/ratelimit", () => ({
    ...actualRatelimit,
    enforceRatelimit: mock(async () => null),
  }));

  const syncPostGitHub = mock(async () => undefined);
  mock.module("../src/utils/sync-post-github", () => ({ syncPostGitHub }));

  const { postsRoutes } = await import("../src/routes/posts");

  const linkedPublish = {
    repositoryId: "repo_test",
    owner: "notra",
    repo: "blog",
    branchName: "notra/article",
    path: "blog/article.md",
    pullRequestNumber: 42,
    pullRequestUrl: "https://github.com/notra/blog/pull/42",
  };
  const initialPost = {
    id: "post_test",
    title: "Article",
    slug: "article",
    markdown: "# Article",
    content: "<h1>Article</h1>",
    htmlUrl: null,
    recommendations: null,
    contentType: "blog_post",
    sourceMetadata: null,
    status: "draft",
    githubPublish: linkedPublish as typeof linkedPublish | null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
  let storedPost = { ...initialPost };
  let writeFails = false;
  const db = {
    query: {
      posts: { findFirst: async () => storedPost },
      organizations: {
        findFirst: async () => ({
          id: "org_test",
          slug: "test",
          name: "Test",
          logo: null,
        }),
      },
    },
    update: () => ({
      set: (updates: Partial<typeof initialPost>) => ({
        where: () => ({
          returning: async () => {
            if (writeFails) {
              return [];
            }
            storedPost = { ...storedPost, ...updates };
            return [storedPost];
          },
        }),
      }),
    }),
  };
  const app = createOpenApiApp();
  app.use("*", async (c, next) => {
    c.set("auth", {
      type: "oauth",
      keyId: "key_test",
      userId: "user_test",
      scopes: ["posts.write"],
      identity: { externalId: "org_test" },
    });
    c.set("db", db as never);
    await next();
  });
  app.route("/", postsRoutes);

  const patchPost = (body: Record<string, unknown>) => {
    return app.request("/posts/post_test", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  beforeEach(() => {
    storedPost = { ...initialPost };
    writeFails = false;
    syncPostGitHub.mockReset();
    syncPostGitHub.mockResolvedValue(undefined);
  });

  describe("PATCH post GitHub sync", () => {
    test.each([
      { markdown: "# Revised article" },
      { title: "Revised title" },
      { slug: "revised-slug" },
    ])("saves before syncing linked content: %j", async (body) => {
      syncPostGitHub.mockImplementationOnce(async () => {
        expect(storedPost).toMatchObject(body);
      });
      const response = await patchPost(body);
      expect(response.status).toBe(200);
      expect(syncPostGitHub).toHaveBeenCalledTimes(1);
      expect(syncPostGitHub).toHaveBeenCalledWith({}, "org_test", "post_test");
    });

    test("also syncs changelogs", async () => {
      storedPost.contentType = "changelog";
      expect((await patchPost({ markdown: "# Release" })).status).toBe(200);
      expect(syncPostGitHub).toHaveBeenCalledTimes(1);
    });

    test("does not publish an unlinked post", async () => {
      storedPost.githubPublish = null;
      expect((await patchPost({ markdown: "# Revised" })).status).toBe(200);
      expect(syncPostGitHub).not.toHaveBeenCalled();
    });

    test("does not sync status-only updates", async () => {
      expect((await patchPost({ status: "draft" })).status).toBe(200);
      expect(syncPostGitHub).not.toHaveBeenCalled();
    });

    test("does not sync after a failed write", async () => {
      writeFails = true;
      expect((await patchPost({ markdown: "# Revised" })).status).toBe(409);
      expect(syncPostGitHub).not.toHaveBeenCalled();
    });

    test("reports partial failure, keeps saved content, and retries sync", async () => {
      syncPostGitHub.mockRejectedValueOnce(new Error("GitHub unavailable"));
      const body = { markdown: "# Saved despite GitHub outage" };
      const failed = await patchPost(body);
      expect(failed.status).toBe(502);
      expect((await failed.json()).error).toContain("Post saved in Notra");
      expect(storedPost.markdown).toBe(body.markdown);

      expect((await patchPost(body)).status).toBe(200);
      expect(syncPostGitHub).toHaveBeenCalledTimes(2);
    });
  });
}
