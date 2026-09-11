import { describe, expect, test } from "bun:test";

import {
  commentMentionsNotra,
  isGitHubBotSender,
  wantsSeparatePullRequest,
} from "./github-mention";

describe("commentMentionsNotra", () => {
  test("matches @notra, case, and [bot] handles", () => {
    expect(commentMentionsNotra("@notra please shorten this", ["notra"])).toBe(
      true
    );
    expect(commentMentionsNotra("@Notra update the intro", ["notra"])).toBe(
      true
    );
    expect(commentMentionsNotra("@notra[bot] fix the typo", ["notra"])).toBe(
      true
    );
  });

  test("ignores other handles and non-mentions", () => {
    expect(commentMentionsNotra("ping @octocat", ["notra"])).toBe(false);
    expect(commentMentionsNotra("email usenotra.com", ["notra"])).toBe(false);
    expect(commentMentionsNotra("notra please", ["notra"])).toBe(false);
  });
});

describe("isGitHubBotSender", () => {
  test("treats bots and the app slug as bot senders", () => {
    expect(isGitHubBotSender({ login: "notra[bot]", type: "Bot" })).toBe(true);
    expect(isGitHubBotSender({ login: "notra[bot]" })).toBe(true);
    expect(isGitHubBotSender({ login: "alice", type: "User" })).toBe(false);
  });
});

describe("wantsSeparatePullRequest", () => {
  test("detects explicit separate-PR requests", () => {
    expect(wantsSeparatePullRequest("@notra open a new PR for this")).toBe(
      true
    );
    expect(wantsSeparatePullRequest("please use a separate pull request")).toBe(
      true
    );
    expect(wantsSeparatePullRequest("don't commit on this PR")).toBe(true);
    expect(wantsSeparatePullRequest("@notra shorten the intro")).toBe(false);
  });
});
