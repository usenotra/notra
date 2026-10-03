import { describe, expect, test } from "bun:test";

import { getEditMarkdownDiff } from "./chat-document-diff";

describe("getEditMarkdownDiff", () => {
  test("returns before and after markdown from a successful edit", () => {
    expect(
      getEditMarkdownDiff({
        success: true,
        filename: "guide.md",
        previousMarkdown: "# Old intro",
        updatedMarkdown: "# New intro",
      })
    ).toEqual({
      filename: "guide.md",
      previousMarkdown: "# Old intro",
      updatedMarkdown: "# New intro",
    });
  });

  test("falls back to document.md when the tool omits a filename", () => {
    expect(
      getEditMarkdownDiff({
        success: true,
        previousMarkdown: "before",
        updatedMarkdown: "after",
      })?.filename
    ).toBe("document.md");
  });

  test("skips identical, failed, and incomplete outputs", () => {
    expect(
      getEditMarkdownDiff({
        success: true,
        previousMarkdown: "same",
        updatedMarkdown: "same",
      })
    ).toBeNull();
    expect(
      getEditMarkdownDiff({
        success: false,
        previousMarkdown: "before",
        updatedMarkdown: "after",
      })
    ).toBeNull();
    expect(getEditMarkdownDiff({ success: true })).toBeNull();
  });
});
