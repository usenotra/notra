import { describe, expect, test } from "bun:test";

import { normalizeParsePdfResponse } from "./context-dev";

describe("normalizeParsePdfResponse", () => {
  test("prefers joined page markdown", () => {
    expect(
      normalizeParsePdfResponse({
        markdown: "whole",
        pages: [{ markdown: "one" }, { text: "two" }, null],
      })
    ).toBe("one\ntwo");
  });

  test("falls back to top-level markdown or text", () => {
    expect(normalizeParsePdfResponse({ markdown: "whole" })).toBe("whole");
    expect(normalizeParsePdfResponse({ text: "plain" })).toBe("plain");
  });

  test("keeps page text when markdown is empty", () => {
    expect(
      normalizeParsePdfResponse({ pages: [{ markdown: "", text: "kept" }] })
    ).toBe("kept");
  });

  test("returns empty string for empty results", () => {
    expect(normalizeParsePdfResponse(null)).toBe("");
    expect(normalizeParsePdfResponse({})).toBe("");
    expect(normalizeParsePdfResponse({ pages: [null] })).toBe("");
  });
});
