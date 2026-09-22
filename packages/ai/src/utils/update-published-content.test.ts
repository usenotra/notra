import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { PublicationSyncResult } from "@notra/ai/types/content-publication";
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
  const syncWrite = mock(async (): Promise<PublicationSyncResult> => ({
    status: "synchronized" as const,
    markdown: "# Updated",
  }));
  mock.module("@notra/ai/utils/content-publication", () => ({
    syncContentPublication: syncWrite,
  }));
  const {
    preparePublicationSyncRepair,
    updatePublishedContentAndCommit,
    syncPublishedPostAfterCommit,
    syncPublishedPostFromPullRequestHead,
  } = await import("./update-published-content");
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
    publicationHeadSha: "recorded-revision",
    path: "docs/page.md",
    publicationId: "publication",
    commitMessage: "docs: update",
  };

  beforeEach(() => {
    syncWrite.mockReset();
    syncWrite.mockResolvedValue({
      status: "synchronized",
      markdown: "# Updated",
    });
  });

  test("records an irreversible commit before failed database synchronization", async () => {
    const outcomes: string[] = [];
    syncWrite.mockImplementation(async () => {
      expect(outcomes).toEqual(["landed"]);
      throw new Error("database unavailable");
    });
    const result = await updatePublishedContentAndCommit({
      ...commitParams,
      octokit: committingOctokit("landed"),
      branch: "content",
      onCommitted: (sha) => {
        outcomes.push(sha);
      },
    });
    expect(result.publicationSync.status).toBe("failed");
    expect(outcomes).toEqual(["landed"]);
    expect(syncWrite).toHaveBeenCalledTimes(3);
  });

  test("exhausted synchronization schedules a revision-guarded durable repair", async () => {
    const failure = new Error("database unavailable");
    const scheduled: unknown[] = [];
    syncWrite.mockRejectedValue(failure);
    const result = await updatePublishedContentAndCommit({
      ...commitParams,
      octokit: committingOctokit("landed"),
      branch: "content",
      scheduleRepair: async (repair) => {
        scheduled.push(repair);
      },
    });
    expect(result.publicationSync.status).toBe("pending");
    expect(scheduled).toEqual([
      {
        organizationId: "org",
        publicationId: "publication",
        postId: "post",
        baselineHeadSha: "recorded-revision",
        expectedHeadSha: "read-revision",
        commitSha: "landed",
        branch: "content",
        markdown: "# Updated",
        title: undefined,
      },
    ]);
  });

  test("a failed scheduler reports the landed commit as failed without recommitting", async () => {
    let commits = 0;
    const octokit = {
      request: async () => ({
        data: {
          login: "publisher",
          author: null,
          commit: { verification: { verified: false } },
        },
      }),
      graphql: async () => {
        commits++;
        return { createCommitOnBranch: { commit: { oid: "landed" } } };
      },
    } as unknown as GitHubMentionOctokit;
    syncWrite.mockRejectedValue(new Error("database unavailable"));
    const result = await updatePublishedContentAndCommit({
      ...commitParams,
      octokit,
      branch: "content",
      scheduleRepair: async () => {
        throw new Error("scheduler unavailable");
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        commitSha: "landed",
        publicationSync: {
          status: "failed",
          error: "Error: scheduler unavailable",
        },
      })
    );
    expect(commits).toBe(1);
  });

  test("a successor waiting for its GitHub parent schedules repair without recommitting", async () => {
    const scheduled: unknown[] = [];
    syncWrite.mockResolvedValue({ status: "retry" });
    const result = await updatePublishedContentAndCommit({
      ...commitParams,
      octokit: committingOctokit("h2"),
      branch: "content",
      scheduleRepair: async (repair) => {
        scheduled.push(repair);
      },
    });
    expect(result.publicationSync.status).toBe("pending");
    expect(scheduled).toEqual([
      expect.objectContaining({
        baselineHeadSha: "recorded-revision",
        expectedHeadSha: "read-revision",
        commitSha: "h2",
      }),
    ]);
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
    expect(syncWrite).not.toHaveBeenCalled();
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
    expect(syncWrite).not.toHaveBeenCalled();
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
    expect(syncWrite).toHaveBeenCalledWith(
      {
        organizationId: "org",
        publicationId: "pub",
        postId: "post",
        baselineHeadSha: "recorded",
        expectedHeadSha: "recorded",
        commitSha: "next",
        branch: "content",
        markdown: "![B](https://cdn/b.png)\n![New](https://cdn/new.png)",
      },
      expect.any(Function)
    );
  });

  test("an applied suggestion copies the pull request file into the post", async () => {
    const octokit = {
      request: async (route: string, args: { ref?: string; path?: string }) => {
        if (String(route).includes("/contents/")) {
          expect(args.ref).toBe("applied");
          expect(args.path).toBe("docs/page.md");
          return {
            data: {
              type: "file",
              content: Buffer.from("# Applied suggestion").toString("base64"),
            },
          };
        }
        return { data: { status: "ahead" } };
      },
    } as unknown as GitHubMentionOctokit;
    const result = await syncPublishedPostFromPullRequestHead({
      octokit,
      organizationId: "org",
      publication: { ...publication, headSha: null },
      commitSha: "applied",
      branch: "content",
    });
    expect(result).toEqual({
      status: "synchronized",
      markdown: "# Updated",
    });
    expect(syncWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        commitSha: "applied",
        markdown: "# Applied suggestion",
      }),
      expect.any(Function)
    );
  });

  test("a missing published file is ignored, but GitHub outages retry", async () => {
    const missing = Object.assign(new Error("Not Found"), { status: 404 });
    const unavailable = Object.assign(new Error("Bad Gateway"), {
      status: 502,
    });
    expect(
      await syncPublishedPostFromPullRequestHead({
        octokit: {
          request: async () => {
            throw missing;
          },
        } as unknown as GitHubMentionOctokit,
        organizationId: "org",
        publication,
        commitSha: "applied",
        branch: "content",
      })
    ).toBe(false);
    await expect(
      syncPublishedPostFromPullRequestHead({
        octokit: {
          request: async () => {
            throw unavailable;
          },
        } as unknown as GitHubMentionOctokit,
        organizationId: "org",
        publication,
        commitSha: "applied",
        branch: "content",
      })
    ).rejects.toThrow("Bad Gateway");
  });

  test("a head that is already recorded does not reread GitHub", async () => {
    const octokit = {
      request: async () => {
        throw new Error("should not read GitHub");
      },
    } as unknown as GitHubMentionOctokit;
    expect(
      await syncPublishedPostFromPullRequestHead({
        octokit,
        organizationId: "org",
        publication: {
          ...publication,
          headSha: "applied",
          markdown: "# Applied",
        },
        commitSha: "applied",
        branch: "content",
      })
    ).toEqual({ status: "synchronized", markdown: "# Applied" });
    expect(syncWrite).not.toHaveBeenCalled();
  });

  test("failed image translation schedules the immutable mapping payload", async () => {
    const scheduled: unknown[] = [];
    const octokit = {
      request: async () => {
        throw new Error("recorded file unavailable");
      },
    } as unknown as GitHubMentionOctokit;
    const result = await syncPublishedPostAfterCommit({
      octokit,
      organizationId: "org",
      publication: {
        ...publication,
        path: "page.md",
        headSha: "recorded",
        markdown: "![A](https://cdn/a.png)",
      },
      files: [{ path: "page.md", contents: "![A](./a.png)" }],
      commitSha: "next",
      branch: "content",
      recordPublicationHead: true,
      scheduleRepair: async (repair) => {
        scheduled.push(structuredClone(repair));
      },
    });
    expect(result).toEqual({ status: "pending" });
    expect(syncWrite).not.toHaveBeenCalled();
    expect(scheduled).toEqual([
      expect.objectContaining({
        commitSha: "next",
        markdown: "![A](./a.png)",
        imageMapping: {
          owner: "acme",
          repo: "docs",
          path: "page.md",
          headSha: "recorded",
          markdown: "![A](https://cdn/a.png)",
        },
      }),
    ]);
  });

  test("repair preparation restores original CDN targets before database sync", async () => {
    const prepared = await preparePublicationSyncRepair(
      {
        organizationId: "org",
        publicationId: "pub",
        postId: "post",
        baselineHeadSha: "recorded",
        expectedHeadSha: "recorded",
        commitSha: "next",
        branch: "content",
        markdown: "![A](./a.png)",
        imageMapping: {
          owner: "acme",
          repo: "docs",
          path: "page.md",
          headSha: "recorded",
          markdown: "![A](https://cdn/a.png)",
        },
      },
      {
        request: async (_route: string, args: { ref: string }) => {
          expect(args.ref).toBe("recorded");
          return {
            data: {
              type: "file",
              content: Buffer.from("![A](./a.png)").toString("base64"),
            },
          };
        },
      } as unknown as GitHubMentionOctokit
    );
    expect(prepared.markdown).toBe("![A](https://cdn/a.png)");
    expect(prepared.imageMapping).toBeUndefined();
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
