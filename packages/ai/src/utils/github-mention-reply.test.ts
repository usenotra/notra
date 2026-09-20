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
  test("returns only the text when nothing was committed", () => {
    expect(
      buildGitHubMentionReply({
        text: "Exports are three times faster.",
        owner: "acme",
        repo: "app",
        commitSha: null,
        files: [],
        followUpPullRequestUrl: null,
      })
    ).toBe("Exports are three times faster.");
  });

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

  test("moves a closing offer below the diff", () => {
    const reply = buildGitHubMentionReply({
      text: "Cut the intro.\n\nWant me to tighten the rest too?",
      owner: "acme",
      repo: "app",
      commitSha: "345543c",
      files: [file],
      followUpPullRequestUrl: null,
    });
    expect(reply.indexOf("```diff")).toBeLessThan(reply.indexOf("Want me"));
    expect(reply.indexOf("Want me")).toBeLessThan(reply.indexOf("<sub>"));
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

  test("still replies with a footer when the diff is unavailable", () => {
    const reply = buildGitHubMentionReply({
      text: "Done.",
      owner: "acme",
      repo: "app",
      commitSha: "7e74414",
      files: [],
      followUpPullRequestUrl: null,
    });
    expect(reply).toBe(
      "Done.\n\n<sub>[`7e74414`](https://github.com/acme/app/commit/7e74414) · mention me again to keep iterating</sub>"
    );
  });
});

describe("buildGitHubMentionDiffSection", () => {
  test("collapses long diffs and widens the fence around code fences", () => {
    const lines = Array.from({ length: 40 }, (_, i) => `+line ${i}`);
    const section = buildGitHubMentionDiffSection([
      { ...file, patch: `@@ -0,0 +1,41 @@\n+\`\`\`ts\n${lines.join("\n")}` },
    ]);
    expect(section.startsWith("<details>")).toBe(true);
    expect(section).toContain("````diff");
  });

  test("labels files when several changed and separates hunks", () => {
    const section = buildGitHubMentionDiffSection([
      { ...file, patch: "@@ -1 +1 @@\n-a\n+b\n@@ -9 +9 @@\n-c\n+d" },
      { ...file, path: "README.md", patch: null },
    ]);
    expect(section).toContain("`docs/changelog/release.md`\n```diff");
    expect(section).toContain("+b\n  ⋯\n-c");
    expect(section).toContain("`README.md`\n_No text diff available._");
  });

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

  test("prefers the published file and handles pure deletions", () => {
    expect(
      findGitHubMentionReplyAnchor(
        [
          { ...file, path: "README.md", patch: "@@ -1 +1 @@\n-a\n+b" },
          { ...file, patch: "@@ -5,3 +5,2 @@\n keep\n-gone\n after" },
        ],
        file.path
      )
    ).toEqual({ path: file.path, startLine: null, line: 5 });
  });

  test("returns null without a text patch", () => {
    expect(
      findGitHubMentionReplyAnchor([{ ...file, patch: null }], null)
    ).toBeNull();
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

  test("leaves the suggestion to the review comments when not inline", () => {
    const reply = buildGitHubMentionProposalReply({
      text: "One sentence now leads with the speedup.",
      proposals,
      inline: null,
    });
    expect(reply).not.toContain("```");
    expect(reply).toContain("`docs/changelog/release.md`");
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

  test("a window that is nearly over reads as a single minute", () => {
    const reply = buildGitHubMentionRateLimitReply(Date.now() + 2_000);
    expect(reply).toContain("in a minute");
    expect(reply).not.toContain("credits");
  });
});
