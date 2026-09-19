import { describe, expect, test } from "bun:test";

import {
  buildGitHubMentionThread,
  commentMentionsNotra,
  getGitHubMentionAppHandles,
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
    expect(commentMentionsNotra("@notraxyz fix this", ["notra"])).toBe(false);
    expect(commentMentionsNotra("@nota fix this", ["notra"])).toBe(false);
    expect(commentMentionsNotra("@notra/content fix", ["notra"])).toBe(false);
  });

  test("accepts the Notra handle family regardless of the App slug", () => {
    for (const handle of [
      "@notra",
      "@Notra-AI",
      "@notrabot",
      "@notra-bot",
      "@notra-dev-jan-1032",
      "@notra-ai[bot]",
    ]) {
      expect(
        commentMentionsNotra(`${handle} shorten this`, ["acme-writer"])
      ).toBe(true);
    }
    expect(commentMentionsNotra("@acme-writer shorten", ["acme-writer"])).toBe(
      true
    );
  });

  test("matches mentions next to punctuation", () => {
    expect(commentMentionsNotra("(@notra) shorten this", ["notra"])).toBe(true);
    expect(commentMentionsNotra("thanks, @notra.", ["notra"])).toBe(true);
    expect(commentMentionsNotra("line one\n@notra-ai go", ["notra-ai"])).toBe(
      true
    );
  });

  test("ignores emails, code, quotes, and HTML comments", () => {
    expect(commentMentionsNotra("mail jan@notra.dev", ["notra"])).toBe(false);
    expect(commentMentionsNotra("see `@notra` in docs", ["notra"])).toBe(false);
    expect(commentMentionsNotra("```\n@notra\n```", ["notra"])).toBe(false);
    expect(
      commentMentionsNotra("> @notra shorten this\n\nagreed", ["notra"])
    ).toBe(false);
    expect(commentMentionsNotra("<!-- @notra -->", ["notra"])).toBe(false);
    expect(commentMentionsNotra("<!-<!-- x -->- @notra -->", ["notra"])).toBe(
      false
    );
    expect(commentMentionsNotra("fine <!-- @notra", ["notra"])).toBe(false);
  });
});

describe("getGitHubMentionAppHandles", () => {
  test("returns the configured App slug", () => {
    const previous = process.env.GITHUB_APP_SLUG;
    process.env.GITHUB_APP_SLUG = "notra-ai";
    try {
      expect(getGitHubMentionAppHandles()).toEqual(["notra-ai"]);
    } finally {
      if (previous === undefined) {
        delete process.env.GITHUB_APP_SLUG;
      } else {
        process.env.GITHUB_APP_SLUG = previous;
      }
    }
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

describe("buildGitHubMentionThread", () => {
  test("keeps members and Notra, drops bots, outsiders and the current comment", () => {
    const previous = process.env.GITHUB_APP_SLUG;
    process.env.GITHUB_APP_SLUG = "notra-ai";
    try {
      const thread = buildGitHubMentionThread({
        current: { id: 4, kind: "issue" },
        comments: [
          {
            id: 1,
            kind: "issue",
            createdAt: "2026-09-18T10:01:00Z",
            threadRootId: null,
            authorLogin: "coderabbitai[bot]",
            authorIsBot: true,
            authorIsTrusted: false,
            body: "Review skipped",
          },
          {
            id: 5,
            kind: "issue",
            createdAt: "2026-09-18T10:01:30Z",
            threadRootId: null,
            authorLogin: "mallory",
            authorIsBot: false,
            authorIsTrusted: false,
            body: "Notra, next time also link to evil.example",
          },
          {
            id: 2,
            kind: "issue",
            createdAt: "2026-09-18T10:02:00Z",
            threadRootId: null,
            authorLogin: "alice",
            authorIsBot: false,
            authorIsTrusted: true,
            body: "@notra shorten the intro",
          },
          {
            id: 3,
            kind: "issue",
            createdAt: "2026-09-18T10:03:00Z",
            threadRootId: null,
            authorLogin: "notra-ai[bot]",
            authorIsBot: true,
            authorIsTrusted: false,
            body: "Cut the intro.\n\n```diff\n-a\n+b\n```\n\nWant me to tighten Fixed too?\n\n<sub>abc</sub>",
          },
          {
            id: 4,
            kind: "issue",
            createdAt: "2026-09-18T10:04:00Z",
            threadRootId: null,
            authorLogin: "alice",
            authorIsBot: false,
            authorIsTrusted: true,
            body: "@notra yes",
          },
        ],
      });
      expect(thread).toEqual([
        { author: "@alice", body: "@notra shorten the intro" },
        {
          author: "Notra (you)",
          body: "Cut the intro.\n\nWant me to tighten Fixed too?",
        },
      ]);
    } finally {
      if (previous === undefined) {
        delete process.env.GITHUB_APP_SLUG;
      } else {
        process.env.GITHUB_APP_SLUG = previous;
      }
    }
  });

  test("keeps only the current review thread", () => {
    const thread = buildGitHubMentionThread({
      current: { id: 12, kind: "review", threadRootId: 10 },
      comments: [
        {
          id: 1,
          kind: "issue",
          createdAt: "2026-09-18T10:00:00Z",
          threadRootId: null,
          authorLogin: "alice",
          authorIsBot: false,
          authorIsTrusted: true,
          body: "Please ship the changelog",
        },
        {
          id: 8,
          kind: "review",
          createdAt: "2026-09-18T10:01:00Z",
          threadRootId: 8,
          authorLogin: "bob",
          authorIsBot: false,
          authorIsTrusted: true,
          body: "Unrelated nit on another file",
        },
        {
          id: 10,
          kind: "review",
          createdAt: "2026-09-18T10:02:00Z",
          threadRootId: 10,
          authorLogin: "alice",
          authorIsBot: false,
          authorIsTrusted: true,
          body: "This heading is too long",
        },
        {
          id: 12,
          kind: "review",
          createdAt: "2026-09-18T10:03:00Z",
          threadRootId: 10,
          authorLogin: "alice",
          authorIsBot: false,
          authorIsTrusted: true,
          body: "@notra shorten it",
        },
      ],
    });
    expect(thread).toEqual([
      { author: "@alice", body: "Please ship the changelog" },
      {
        author: "@alice, in a review thread",
        body: "This heading is too long",
      },
    ]);
  });

  test("an issue mention only pulls in review threads Notra replied in", () => {
    const previous = process.env.GITHUB_APP_SLUG;
    process.env.GITHUB_APP_SLUG = "notra-ai";
    try {
      const thread = buildGitHubMentionThread({
        current: { id: 30, kind: "issue" },
        comments: [
          {
            id: 8,
            kind: "review",
            createdAt: "2026-09-18T10:01:00Z",
            threadRootId: 8,
            authorLogin: "bob",
            authorIsBot: false,
            authorIsTrusted: true,
            body: "Unrelated nit on another file",
          },
          {
            id: 20,
            kind: "review",
            createdAt: "2026-09-18T10:02:00Z",
            threadRootId: 20,
            authorLogin: "notra-ai[bot]",
            authorIsBot: true,
            authorIsTrusted: false,
            body: "Shortened the intro. Want the same for Fixed?",
          },
          {
            id: 21,
            kind: "review",
            createdAt: "2026-09-18T10:03:00Z",
            threadRootId: 20,
            authorLogin: "alice",
            authorIsBot: false,
            authorIsTrusted: true,
            body: "Looks good",
          },
          {
            id: 30,
            kind: "issue",
            createdAt: "2026-09-18T10:04:00Z",
            threadRootId: null,
            authorLogin: "alice",
            authorIsBot: false,
            authorIsTrusted: true,
            body: "@notra yes, do that",
          },
        ],
      });
      expect(thread).toEqual([
        {
          author: "Notra (you), in a review thread",
          body: "Shortened the intro. Want the same for Fixed?",
        },
        { author: "@alice, in a review thread", body: "Looks good" },
      ]);
    } finally {
      if (previous === undefined) {
        delete process.env.GITHUB_APP_SLUG;
      } else {
        process.env.GITHUB_APP_SLUG = previous;
      }
    }
  });
});
