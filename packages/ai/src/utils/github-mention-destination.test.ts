import { describe, expect, test } from "bun:test";

import { resolveGitHubMentionDestination } from "./github-mention-destination";

const pullRequest = {
  number: 42,
  headRef: "notra/changelog-abc",
  headSha: "abc123",
};

describe("resolveGitHubMentionDestination", () => {
  test("defaults to the mention pull request", () => {
    expect(
      resolveGitHubMentionDestination({
        commentBody: "@notra shorten the intro",
        pullRequest,
      })
    ).toEqual({
      mode: "same_pull_request",
      pullRequestNumber: 42,
      headRef: "notra/changelog-abc",
      headSha: "abc123",
    });
  });

  test("opens a follow-up PR only when asked", () => {
    expect(
      resolveGitHubMentionDestination({
        commentBody: "@notra open a new PR with the shorter intro",
        pullRequest,
      }).mode
    ).toBe("new_pull_request");
  });

  test("replies only when there is no pull request", () => {
    expect(
      resolveGitHubMentionDestination({
        commentBody: "@notra what is this?",
        pullRequest: null,
      })
    ).toEqual({
      mode: "reply_only",
      pullRequestNumber: null,
      headRef: null,
      headSha: null,
    });
  });
});
