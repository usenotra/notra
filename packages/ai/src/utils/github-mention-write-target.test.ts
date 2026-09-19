import { describe, expect, test } from "bun:test";

import type {
  GitHubMentionContext,
  GitHubMentionOctokit,
} from "@notra/ai/types/github-mention";

import {
  type GitHubMentionWriteState,
  resolveGitHubMentionWriteTarget,
} from "./github-mention-write-target";

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
        base: { ref: "release" },
        draft: false,
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
    ).rejects.toThrow("fork");
  });

  test("opens a follow-up branch in the base repo for a fork pull request", async () => {
    const octokit = {
      request: async (route: string) => {
        if (route === "GET /repos/{owner}/{repo}/pulls/{pull_number}") {
          return {
            data: {
              number: 7,
              title: "docs",
              body: null,
              html_url: "https://github.com/acme/app/pull/7",
              head: {
                ref: "fix-docs",
                sha: "abc123",
                repo: { full_name: "someone/app" },
              },
              base: { ref: "release" },
              draft: false,
            },
          };
        }
        if (route === "POST /repos/{owner}/{repo}/git/refs") {
          return { data: {} };
        }
        if (route === "GET /repos/{owner}/{repo}/git/ref/{ref}") {
          return { data: { object: { sha: "abc123" } } };
        }
        throw new Error(route);
      },
    } as unknown as GitHubMentionOctokit;
    const state = emptyState();
    const target = await resolveGitHubMentionWriteTarget({
      octokit,
      context: context("new_pull_request"),
      state,
    });
    expect(target.branch).toBe("notra/mention-7-1");
    expect(state.writeBranch).toBe("notra/mention-7-1");
  });

  test("targets the head branch of a same-repository pull request", async () => {
    const target = await resolveGitHubMentionWriteTarget({
      octokit: fakeOctokit({
        ref: "notra/changelog",
        repoFullName: "Acme/App",
      }),
      context: context("same_pull_request"),
      state: emptyState(),
    });
    expect(target).toMatchObject({
      branch: "notra/changelog",
      expectedHeadOid: "abc123",
      pullNumber: 7,
    });
  });
});
