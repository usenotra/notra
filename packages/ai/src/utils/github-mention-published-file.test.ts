import { describe, expect, test } from "bun:test";

import { resolveEditableMarkdown } from "./github-mention-published-file";

const POST =
  '# Release\n\n![Chart](https://cdn.notra.dev/a.png)\n\n<video controls src="https://cdn.notra.dev/a.mp4"></video>\n\nOld intro.';
const FILE =
  '# Release\n\n![Chart](../images/release/a.png)\n\n<video controls src="./a.mp4"></video>\n\nOld intro.';

describe("resolveEditableMarkdown", () => {
  test("never substitutes stale post content for an unreadable moved head", () => {
    for (const recordedHeadSha of ["aaa", null]) {
      expect(() =>
        resolveEditableMarkdown({
          postMarkdown: POST,
          publishedFile: null,
          recordedHeadSha,
          pullRequestHeadSha: "bbb",
        })
      ).toThrow("could not be read");
    }
  });

  test("uses the post while the pull request head is the recorded one", () => {
    expect(
      resolveEditableMarkdown({
        postMarkdown: POST,
        publishedFile: FILE.replace("Old", "Hand-edited"),
        recordedHeadSha: "aaa",
        pullRequestHeadSha: "aaa",
      })
    ).toEqual({ markdown: POST, fromPullRequest: false });
  });

  test("uses the file once the head moved, retaining repository image paths", () => {
    expect(
      resolveEditableMarkdown({
        postMarkdown: POST,
        publishedFile: FILE.replace("Old", "Hand-edited"),
        recordedHeadSha: "aaa",
        pullRequestHeadSha: "bbb",
      })
    ).toEqual({
      markdown: FILE.replace("Old", "Hand-edited"),
      fromPullRequest: true,
    });
  });
});
