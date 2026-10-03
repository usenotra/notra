import { describe, expect, test } from "bun:test";

import { geoAnswerMentionSpans } from "../src/utils/geo-answer-mentions";

describe("geoAnswerMentionSpans", () => {
  test("does not treat a combining mark after a brand as a word boundary", () => {
    expect(
      geoAnswerMentionSpans("Notion\u0301 is a note app", [
        { phrase: "Notion", kind: "own" },
      ])
    ).toEqual([]);
  });

  test("still highlights a standalone brand", () => {
    expect(
      geoAnswerMentionSpans("Notion is a note app", [
        { phrase: "Notion", kind: "own" },
      ])
    ).toEqual([{ start: 0, end: 6, kind: "own", phrase: "Notion" }]);
  });

  test("does not highlight a brand inside a longer word", () => {
    expect(
      geoAnswerMentionSpans("Notional tools", [
        { phrase: "Notion", kind: "own" },
      ])
    ).toEqual([]);
  });

  test("matches case-folded spellings the prefilter could miss", () => {
    expect(
      geoAnswerMentionSpans("Try \u017Fhop or \u03A3IGMA today", [
        { phrase: "Shop", kind: "competitor" },
        { phrase: "\u03C3igma", kind: "competitor" },
      ])
    ).toEqual([
      { start: 4, end: 8, kind: "competitor", phrase: "Shop" },
      { start: 12, end: 17, kind: "competitor", phrase: "\u03C3igma" },
    ]);
  });
});
