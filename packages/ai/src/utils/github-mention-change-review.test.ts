import { describe, expect, test } from "bun:test";

import type {
  GitHubMentionContext,
  GitHubMentionOctokit,
} from "@notra/ai/types/github-mention";

import { reviewGitHubMentionChange } from "./github-mention-change-review";

const context = {
  organizationId: "org_1",
  deliveryId: "delivery_1",
  owner: "acme",
  repo: "app",
  issueNumber: 7,
  sender: { id: 1, login: "alice" },
} as GitHubMentionContext;

function fakeOctokit(files: Record<string, string>, status = 404) {
  return {
    request: async (_route: string, params: { path: string }) => {
      const contents = files[params.path];
      if (contents === undefined) {
        throw Object.assign(new Error("request failed"), { status });
      }
      return {
        data: {
          type: "file",
          content: Buffer.from(contents).toString("base64"),
        },
      };
    },
  } as unknown as GitHubMentionOctokit;
}

describe("reviewGitHubMentionChange", () => {
  test("blocks new active content against the file on the branch", async () => {
    const previous = 'import { Note } from "../note";\n\n# Release';
    const review = await reviewGitHubMentionChange({
      octokit: fakeOctokit({ "docs/release.mdx": previous }),
      context,
      branch: "notra/changelog",
      files: [
        {
          path: "docs/release.mdx",
          contents: `${previous}\nexport const x = process.env;`,
        },
        { path: "docs/new.md", contents: "# New\n\nPlain text." },
      ],
    });
    expect(review.blocked).toEqual([
      {
        path: "docs/release.mdx",
        reason: "adds an MDX import or export",
        line: "export const x = process.env;",
      },
    ]);
  });

  test("ordinary edits pass", async () => {
    const review = await reviewGitHubMentionChange({
      octokit: fakeOctokit({ "docs/a.md": "# A" }),
      context,
      branch: "notra/changelog",
      files: [{ path: "docs/a.md", contents: "# A\n\nShorter." }],
    });
    expect(review.blocked).toEqual([]);
  });

  test("an unreadable previous file stops the write", async () => {
    await expect(
      reviewGitHubMentionChange({
        octokit: fakeOctokit({}, 500),
        context,
        branch: "notra/changelog",
        files: [{ path: "docs/a.md", contents: "# A" }],
      })
    ).rejects.toThrow("request failed");
  });
});
