import { describe, expect, test } from "bun:test";

import { resolveChatToolBlockVisuals } from "./visuals";

const baseVisuals = {
  toolName: "editMarkdown",
  input: { operations: [] },
  hasInput: true,
  hasOutput: true,
  isError: false,
  isStreaming: false,
  isAwaitingApproval: false,
};

describe("resolveChatToolBlockVisuals", () => {
  test("surfaces a document diff and hides the raw markdown JSON", () => {
    const visuals = resolveChatToolBlockVisuals({
      ...baseVisuals,
      output: {
        success: true,
        filename: "post.md",
        previousMarkdown: "# Old",
        updatedMarkdown: "# New",
      },
    });

    expect(visuals.documentDiff).toEqual({
      filename: "post.md",
      previousMarkdown: "# Old",
      updatedMarkdown: "# New",
    });
    expect(visuals.showJsonOutput).toBe(false);
    expect(visuals.showJsonInput).toBe(false);
  });

  test("does not treat other tools as document diffs", () => {
    expect(
      resolveChatToolBlockVisuals({
        ...baseVisuals,
        toolName: "mcp_write_file",
        output: {
          success: true,
          filename: "post.md",
          previousMarkdown: "# Old",
          updatedMarkdown: "# New",
        },
      }).documentDiff
    ).toBeNull();
  });

  test("waits until the tool finishes streaming", () => {
    expect(
      resolveChatToolBlockVisuals({
        ...baseVisuals,
        isStreaming: true,
        output: {
          success: true,
          previousMarkdown: "# Old",
          updatedMarkdown: "# New",
        },
      }).documentDiff
    ).toBeNull();
  });
});
