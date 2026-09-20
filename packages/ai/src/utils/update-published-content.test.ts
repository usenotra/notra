import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { GitHubMentionOctokit } from "@notra/ai/types/github-mention";

// Bun module mocks otherwise replace exports used by neighboring webhook tests.
if (process.env.NOTRA_PUBLICATION_TEST_WORKER !== "1") {
  test("publication write regressions in an isolated module registry", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      { env: { ...process.env, NOTRA_PUBLICATION_TEST_WORKER: "1" } }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const postWrite = mock(async () => {});
  const headWrite = mock(async () => {});
  mock.module("@notra/ai/utils/post-service", () => ({
    updatePostRecord: postWrite,
  }));
  mock.module("@notra/ai/utils/content-publication", () => ({
    updateContentPublicationHead: headWrite,
  }));
  const { updatePublishedContentAndCommit, syncPublishedPostAfterCommit } =
    await import("./update-published-content");
  const { commitFilesToPullRequest } = await import("./github-pr-commit");

  const committingOctokit = (oid: string) =>
    ({
      request: async () => ({
        data: {
          login: "publisher",
          author: null,
          commit: { verification: { verified: false } },
        },
      }),
      graphql: async () => ({ createCommitOnBranch: { commit: { oid } } }),
    }) as unknown as GitHubMentionOctokit;

  const publication = {
    id: "pub",
    postId: "post",
    path: "docs/page.md",
    owner: "acme",
    repo: "docs",
    headSha: "original",
  };

  const commitParams = {
    organizationId: "org",
    postId: "post",
    markdown: "# Updated",
    owner: "acme",
    repo: "docs",
    expectedHeadOid: "read-revision",
    path: "docs/page.md",
    publicationId: "publication",
    commitMessage: "docs: update",
  };

  beforeEach(() => {
    postWrite.mockReset();
    headWrite.mockReset();
  });

  test("records an irreversible commit before failed database synchronization", async () => {
    const outcomes: string[] = [];
    postWrite.mockImplementation(async () => {
      expect(outcomes).toEqual(["landed"]);
      throw new Error("database unavailable");
    });
    await expect(
      updatePublishedContentAndCommit({
        ...commitParams,
        octokit: committingOctokit("landed"),
        branch: "content",
        onCommitted: (sha) => {
          outcomes.push(sha);
        },
      })
    ).rejects.toThrow("database unavailable");
    expect(outcomes).toEqual(["landed"]);
    expect(headWrite).not.toHaveBeenCalled();
  });

  test("an unrelated file commit never advances publication synchronization", async () => {
    expect(
      await syncPublishedPostAfterCommit({
        octokit: {} as GitHubMentionOctokit,
        organizationId: "org",
        publication,
        files: [{ path: "README.md", contents: "# Other" }],
        commitSha: "new",
        branch: "content",
        recordPublicationHead: true,
      })
    ).toBe(false);
    expect(postWrite).not.toHaveBeenCalled();
    expect(headWrite).not.toHaveBeenCalled();
  });

  test("a commit on a follow-up branch leaves the post as published", async () => {
    const octokit = committingOctokit("follow-up");
    const branch = "notra/mention-1-issue-2";
    const result = await updatePublishedContentAndCommit({
      ...commitParams,
      octokit,
      branch,
      recordPublicationHead: false,
    });
    expect(result.commitSha).toBe("follow-up");
    expect(
      await syncPublishedPostAfterCommit({
        octokit,
        organizationId: "org",
        publication,
        files: [{ path: "docs/page.md", contents: "# Updated" }],
        commitSha: "follow-up",
        branch,
        recordPublicationHead: false,
      })
    ).toBe(false);
    expect(postWrite).not.toHaveBeenCalled();
    expect(headWrite).not.toHaveBeenCalled();
  });

  test("image synchronization uses the recorded file rather than the changed image order", async () => {
    const octokit = {
      request: async (_route: string, args: { ref: string }) => {
        expect(args.ref).toBe("recorded");
        return {
          data: {
            type: "file",
            content: Buffer.from("![A](./a.png)\n![B](./b.png)").toString(
              "base64"
            ),
          },
        };
      },
    } as unknown as GitHubMentionOctokit;
    await syncPublishedPostAfterCommit({
      octokit,
      organizationId: "org",
      publication: {
        ...publication,
        path: "page.md",
        headSha: "recorded",
        markdown: "![A](https://cdn/a.png)\n![B](https://cdn/b.png)",
      },
      files: [
        {
          path: "page.md",
          contents: "![B](./b.png)\n![New](https://cdn/new.png)",
        },
      ],
      commitSha: "next",
      branch: "content",
      recordPublicationHead: true,
    });
    expect(postWrite).toHaveBeenCalledWith({
      organizationId: "org",
      postId: "post",
      markdown: "![B](https://cdn/b.png)\n![New](https://cdn/new.png)",
    });
    expect(headWrite).toHaveBeenCalledWith({
      organizationId: "org",
      publicationId: "pub",
      headSha: "next",
      branch: "content",
    });
  });

  test("mention commits preserve only verified publisher metadata", async () => {
    const previousSlug = process.env.GITHUB_APP_SLUG;
    process.env.GITHUB_APP_SLUG = "notra-test";
    try {
      for (const verified of [true, false]) {
        let message: unknown;
        const octokit = {
          // Without App credentials the publisher login comes from GET /user.
          request: async (route: string) => ({
            data: {
              login: route === "GET /user" ? "notra-test[bot]" : undefined,
              author: { login: "notra-test[bot]" },
              commit: {
                message: "docs: publish\n\nnotra-content:metadata",
                verification: { verified },
              },
            },
          }),
          graphql: async (
            _query: string,
            variables: { input: { message: unknown } }
          ) => {
            message = variables.input.message;
            return { createCommitOnBranch: { commit: { oid: "next" } } };
          },
        } as unknown as GitHubMentionOctokit;
        await commitFilesToPullRequest({
          octokit,
          owner: "acme",
          repo: "docs",
          branch: "content",
          expectedHeadOid: "parent",
          headline: "docs: edit",
          files: [{ path: "page.md", contents: "# Edit" }],
        });
        expect(message).toEqual(
          verified
            ? { headline: "docs: edit", body: "notra-content:metadata" }
            : { headline: "docs: edit" }
        );
      }
    } finally {
      if (previousSlug === undefined) {
        delete process.env.GITHUB_APP_SLUG;
      } else {
        process.env.GITHUB_APP_SLUG = previousSlug;
      }
    }
  });
}
