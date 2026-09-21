import { describe, expect, test } from "bun:test";

import type {
  GitHubMentionContext,
  GitHubMentionOctokit,
  GitHubMentionWriteState,
} from "@notra/ai/types/github-mention";

import { resolveGitHubMentionWriteTarget } from "./github-mention-write-target";

function fakeOctokit(head: {
  ref: string;
  repoFullName: string | null;
  sha?: string;
  state?: "open" | "closed";
  merged?: boolean;
}) {
  return {
    request: async () => ({
      data: {
        number: 7,
        title: "docs",
        body: null,
        html_url: "https://github.com/acme/app/pull/7",
        head: {
          ref: head.ref,
          sha: head.sha ?? "abc123",
          repo: head.repoFullName ? { full_name: head.repoFullName } : null,
        },
        base: { ref: "release", repo: { default_branch: "main" } },
        draft: false,
        state: head.state ?? "open",
        merged: head.merged ?? false,
      },
    }),
  } as unknown as GitHubMentionOctokit;
}

function context(
  mode: GitHubMentionContext["destination"]["mode"]
): GitHubMentionContext {
  return {
    owner: "acme",
    repo: "app",
    defaultBranch: "main",
    issueNumber: 7,
    comment: { id: 1, body: "@notra-ai fix", htmlUrl: "", review: null },
    destination: {
      mode,
      pullRequestNumber: 7,
      headRef: "main",
      headSha: "abc123",
    },
  } as GitHubMentionContext;
}

const emptyState = (): GitHubMentionWriteState => ({
  writeBranch: null,
  writePullNumber: null,
  writePullRequestUrl: null,
});

describe("resolveGitHubMentionWriteTarget", () => {
  test("refuses to commit when the pull request head is the default branch", async () => {
    await expect(
      resolveGitHubMentionWriteTarget({
        octokit: fakeOctokit({ ref: "main", repoFullName: "acme/app" }),
        context: context("same_pull_request"),
        state: emptyState(),
      })
    ).rejects.toThrow("default branch");
  });

  test("refuses to commit to fork pull requests", async () => {
    await expect(
      resolveGitHubMentionWriteTarget({
        octokit: fakeOctokit({ ref: "fix-docs", repoFullName: "someone/app" }),
        context: context("same_pull_request"),
        state: emptyState(),
      })
    ).rejects.toThrow("Fork");
  });

  test("refuses to write from a closed or merged pull request", async () => {
    for (const lifecycle of [
      { state: "closed" as const, merged: false },
      { state: "closed" as const, merged: true },
    ]) {
      await expect(
        resolveGitHubMentionWriteTarget({
          octokit: fakeOctokit({
            ref: "docs",
            repoFullName: "acme/app",
            ...lifecycle,
          }),
          context: context("same_pull_request"),
          state: emptyState(),
        })
      ).rejects.toThrow("closed pull request");
    }
  });

  test("refuses to create a follow-up branch from a moved source head", async () => {
    const initial = context("new_pull_request");
    initial.destination.headSha = "read-before-manual-push";
    await expect(
      resolveGitHubMentionWriteTarget({
        octokit: fakeOctokit({
          ref: "docs",
          repoFullName: "acme/app",
          sha: "manual-push",
        }),
        context: initial,
        state: emptyState(),
      })
    ).rejects.toThrow("changed");
  });

  test("keeps the revision read by the agent even when the remote head moves", async () => {
    const initial = context("same_pull_request");
    initial.destination.headSha = "read-before-manual-push";
    const target = await resolveGitHubMentionWriteTarget({
      octokit: fakeOctokit({ ref: "docs", repoFullName: "acme/app" }),
      context: initial,
      state: emptyState(),
    });
    expect(target.expectedHeadOid).toBe("read-before-manual-push");
    const subsequent = await resolveGitHubMentionWriteTarget({
      octokit: fakeOctokit({ ref: "docs", repoFullName: "acme/app" }),
      context: initial,
      state: { ...emptyState(), commitSha: "this-runs-commit" },
    });
    expect(subsequent.expectedHeadOid).toBe("this-runs-commit");
  });
});
