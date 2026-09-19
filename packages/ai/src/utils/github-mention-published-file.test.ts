import { describe, expect, test } from "bun:test";

import {
  carryOverImageTargets,
  resolveEditableMarkdown,
} from "./github-mention-published-file";

const POST = "# Release\n\n![Chart](https://cdn.notra.dev/a.png)\n\nOld intro.";
const FILE = "# Release\n\n![Chart](../images/release/a.png)\n\nOld intro.";

describe("carryOverImageTargets", () => {
  test("keeps the repository paths when post text is committed", () => {
    expect(
      carryOverImageTargets(POST.replace("Old intro.", "New intro."), FILE)
    ).toBe(FILE.replace("Old intro.", "New intro."));
  });

  test("keeps the post URLs when a committed file becomes the post", () => {
    expect(
      carryOverImageTargets(FILE.replace("Old intro.", "New intro."), POST)
    ).toBe(POST.replace("Old intro.", "New intro."));
  });

  test("leaves the text alone when the images no longer line up", () => {
    const withExtraImage = `${FILE}\n\n![New](./new.png)`;
    expect(carryOverImageTargets(withExtraImage, POST)).toBe(withExtraImage);
    expect(carryOverImageTargets("No images here.", POST)).toBe(
      "No images here."
    );
  });

  test("does not swap one absolute URL for another", () => {
    const edited = POST.replace("a.png", "b.png");
    expect(carryOverImageTargets(edited, POST)).toBe(edited);
  });
});

describe("resolveEditableMarkdown", () => {
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

  test("uses the file once the head moved, with the post's image URLs", () => {
    expect(
      resolveEditableMarkdown({
        postMarkdown: POST,
        publishedFile: FILE.replace("Old", "Hand-edited"),
        recordedHeadSha: "aaa",
        pullRequestHeadSha: "bbb",
      })
    ).toEqual({
      markdown: POST.replace("Old", "Hand-edited"),
      fromPullRequest: true,
    });
  });

  test("a moved head with an unchanged file is not a divergence", () => {
    expect(
      resolveEditableMarkdown({
        postMarkdown: POST,
        publishedFile: FILE,
        recordedHeadSha: "aaa",
        pullRequestHeadSha: "bbb",
      })
    ).toEqual({ markdown: POST, fromPullRequest: false });
  });

  test("falls back to the post when the file could not be read", () => {
    expect(
      resolveEditableMarkdown({
        postMarkdown: POST,
        publishedFile: null,
        recordedHeadSha: "aaa",
        pullRequestHeadSha: "bbb",
      })
    ).toEqual({ markdown: POST, fromPullRequest: false });
  });
});
