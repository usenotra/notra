import { describe, expect, test } from "bun:test";

import { isContentEditorStandaloneTool } from "./content-editor-standalone-tool";

function tool(name: string) {
  return {
    type: `tool-${name}` as const,
    toolCallId: `${name}-1`,
    state: "output-available" as const,
    input: {},
    output: {},
  };
}

describe("isContentEditorStandaloneTool", () => {
  test("keeps document and image edits out of the activity group", () => {
    expect(isContentEditorStandaloneTool(tool("editMarkdown"))).toBe(true);
    expect(isContentEditorStandaloneTool(tool("reviseImage"))).toBe(true);
  });

  test("leaves research tools grouped", () => {
    expect(isContentEditorStandaloneTool(tool("webSearch"))).toBe(false);
    expect(isContentEditorStandaloneTool(tool("getMarkdown"))).toBe(false);
  });
});
