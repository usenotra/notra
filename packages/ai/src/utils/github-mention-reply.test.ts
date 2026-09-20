import { describe, expect, test } from "bun:test";

import {
  buildGitHubMentionDiffSection,
  buildGitHubMentionProposalFallbackReply,
  buildGitHubMentionProposalReply,
  buildGitHubMentionRateLimitReply,
  findGitHubMentionReplyAnchor,
  buildGitHubMentionReply,
} from "./github-mention-reply";

const file = {
  path: "docs/changelog/release.md",
  additions: 1,
  deletions: 2,
  patch:
    "@@ -1,5 +1,4 @@\n # Release\n \n-Old intro one.\n-Old intro two.\n+New intro.\n \n ## New",
};

describe("buildGitHubMentionReply", () => {
  test("appends changed lines and a linked footer", () => {
    const reply = buildGitHubMentionReply({
      text: "Cut the intro to one sentence.",
      owner: "acme",
      repo: "app",
      commitSha: "345543c0aa11bb22",
      files: [file],
      followUpPullRequestUrl: null,
    });
    expect(reply).toContain(
      "```diff\n-Old intro one.\n-Old intro two.\n+New intro.\n```"
    );
    expect(reply).not.toContain("@@");
    expect(reply).toContain(
      "[`345543c`](https://github.com/acme/app/commit/345543c0aa11bb22)"
    );
    expect(reply).toContain("`docs/changelog/release.md` · +1 −2");
    expect(reply).not.toContain("Draft PR");
  });

  test("names the follow-up pull request in the footer", () => {
    const reply = buildGitHubMentionReply({
      text: "Opened #11.",
      owner: "acme",
      repo: "app",
      commitSha: "7e74414",
      files: [file],
      followUpPullRequestUrl: "https://github.com/acme/app/pull/11",
    });
    expect(reply).toContain("<sub>Draft PR #11 · ");
  });
});

describe("buildGitHubMentionDiffSection", () => {
  test("marks later diffs omitted after the line budget is exhausted", () => {
    const fullPatch = `@@ -1,200 +1,200 @@\n${Array.from(
      { length: 200 },
      (_, index) => `+line ${index}`
    ).join("\n")}`;
    const section = buildGitHubMentionDiffSection([
      { ...file, patch: fullPatch },
      { ...file, path: "README.md", patch: "@@ -1 +1 @@\n-old\n+new" },
    ]);
    expect(section).toContain("additional diff omitted (line limit reached)");
  });
});

describe("findGitHubMentionReplyAnchor", () => {
  test("anchors to the added lines of the first changed hunk", () => {
    expect(
      findGitHubMentionReplyAnchor(
        [
          {
            ...file,
            patch:
              "@@ -10,6 +10,7 @@\n ctx\n ctx\n-old\n+new one\n+new two\n ctx\n@@ -40 +41 @@\n-x\n+y",
          },
        ],
        null
      )
    ).toEqual({ path: file.path, startLine: 12, line: 13 });
  });
});

describe("proposal replies", () => {
  const suggestion = {
    path: "docs/changelog/release.md",
    startLine: 3,
    line: 4,
    previousLines: ["Old intro one.", "Old intro two."],
    replacement: ["New intro."],
  };
  const proposals = [
    {
      path: suggestion.path,
      commitSha: "345543c0aa11bb22",
      previous: "# Release\n\nOld intro one.\nOld intro two.\n",
      suggestions: [suggestion],
    },
  ];

  test("puts the suggestion between the summary and the closing offer", () => {
    const reply = buildGitHubMentionProposalReply({
      text: "One sentence now leads with the speedup.\n\nWant me to trim the Fixed section too?",
      proposals,
      inline: suggestion,
    });
    expect(reply).toContain("```suggestion\nNew intro.\n```");
    expect(reply.indexOf("```suggestion")).toBeLessThan(
      reply.indexOf("Want me")
    );
    expect(reply).toContain("commit it from the suggestion to apply");
  });

  test("falls back to a plain diff and an offer to commit", () => {
    const reply = buildGitHubMentionProposalFallbackReply({
      text: "One sentence now leads with the speedup.",
      proposals,
    });
    expect(reply).toContain(
      "```diff\n-Old intro one.\n-Old intro two.\n+New intro.\n```"
    );
    expect(reply).toContain("tell me to apply it and I will commit it");
  });
});

describe("buildGitHubMentionRateLimitReply", () => {
  test("says when to come back, in whole minutes", () => {
    expect(
      buildGitHubMentionRateLimitReply(Date.now() + 4 * 60_000 + 30_000)
    ).toContain("about 5 minutes");
  });
});
