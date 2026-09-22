import { expect, test } from "bun:test";

import type {
  GitHubMentionContext,
  GitHubMentionOctokit,
} from "@notra/ai/types/github-mention";

import { postGitHubMentionProposal } from "./github-mention-reply-delivery";

test("a proposal that cannot be inlined still replies in its review thread", async () => {
  const routes: string[] = [];
  const octokit = {
    request: async (route: string) => {
      routes.push(route);
      return { data: { id: 1, html_url: "https://github.com/comment/1" } };
    },
  } as unknown as GitHubMentionOctokit;
  const context = {
    deliveryId: "delivery_1",
    owner: "acme",
    repo: "docs",
    issueNumber: 7,
    pullRequest: { number: 7 },
    comment: {
      id: 10,
      review: {
        path: "docs/release.md",
        line: 3,
        startLine: null,
        commitSha: "abc123",
        diffHunk: "@@ -3 +3 @@\n-old\n+new",
        rootCommentId: 9,
      },
    },
  } as GitHubMentionContext;

  await postGitHubMentionProposal({
    octokit,
    context,
    text: "I would update the introduction.",
    proposals: [
      {
        path: "docs/other.md",
        commitSha: "abc123",
        previous: "Old",
        suggestions: [
          {
            path: "docs/other.md",
            startLine: 1,
            line: 1,
            previousLines: ["Old"],
            replacement: ["New"],
          },
        ],
      },
    ],
  });

  expect(routes).toEqual([
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies",
  ]);
});
