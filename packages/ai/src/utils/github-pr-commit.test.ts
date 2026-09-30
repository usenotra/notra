import { describe, expect, test } from "bun:test";

import type { GitHubMentionOctokit } from "@notra/ai/types/github-mention";

import {
  createDraftPullRequest,
  getGitHubPullRequestFilePatch,
} from "./github-pr-commit";

describe("getGitHubPullRequestFilePatch", () => {
  test("continues beyond 300 files", async () => {
    const pages: number[] = [];
    const octokit = {
      request: async (_route: string, request: { page: number }) => {
        pages.push(request.page);
        return {
          data:
            request.page === 4
              ? [{ filename: "target.md", patch: "+found" }]
              : Array.from({ length: 100 }, (_, index) => ({
                  filename: `${request.page}-${index}.md`,
                  patch: null,
                })),
        };
      },
    } as unknown as GitHubMentionOctokit;
    await expect(
      getGitHubPullRequestFilePatch({
        octokit,
        owner: "acme",
        repo: "app",
        pullNumber: 1,
        path: "target.md",
      })
    ).resolves.toBe("+found");
    expect(pages).toEqual([1, 2, 3, 4]);
  });
});

describe("createDraftPullRequest", () => {
  const params = {
    owner: "acme",
    repo: "app",
    title: "Follow-up",
    body: "Body",
    head: "notra/follow-up",
    base: "release",
  };

  test("recovers only a duplicate-PR 422 and matches the base", async () => {
    const duplicate = {
      status: 422,
      errors: [
        { message: "A pull request already exists for acme:notra/follow-up." },
      ],
    };
    const octokit = {
      request: async (route: string) => {
        if (route.startsWith("POST")) {
          throw duplicate;
        }
        return {
          data: [
            {
              number: 1,
              html_url: "wrong",
              head: { ref: params.head, sha: "a" },
              base: { ref: "main" },
            },
            {
              number: 2,
              html_url: "right",
              head: { ref: params.head, sha: "b" },
              base: { ref: params.base },
            },
          ],
        };
      },
    } as unknown as GitHubMentionOctokit;
    await expect(
      createDraftPullRequest({ ...params, octokit })
    ).resolves.toMatchObject({
      number: 2,
      htmlUrl: "right",
    });
  });

  test("does not recover unrelated validation failures", async () => {
    const validation = { status: 422, message: "Validation Failed" };
    const octokit = {
      request: async () => {
        throw validation;
      },
    } as unknown as GitHubMentionOctokit;
    await expect(createDraftPullRequest({ ...params, octokit })).rejects.toBe(
      validation
    );
  });
});
