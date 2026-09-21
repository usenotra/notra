import { describe, expect, test } from "bun:test";

import type {
  GitHubMentionContext,
  GitHubMentionOctokit,
  GitHubMentionWriteState,
} from "@notra/ai/types/github-mention";

import { resolveGitHubMentionWriteTarget } from "./github-mention-write-target";

function fakeOctokit(head: { ref: string; repoFullName: string | null }) {
  return {
    request: async () => ({
      data: {
        number: 7,
        title: "docs",
        body: null,
        html_url: "https://github.com/acme/app/pull/7",
        head: {
          ref: head.ref,
          sha: "abc123",
          repo: head.repoFullName ? { full_name: head.repoFullName } : null,
        },
        base: { ref: "release", repo: { default_branch: "main" } },
        draft: false,
        state: "open",
        merged: false,
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
