import { describe, expect, test } from "bun:test";

import {
  geoAnswerMentionSpans,
  geoAnswerMentionTerms,
} from "../src/utils/geo-answer-mentions";

describe("geoAnswerMentionTerms", () => {
  test("keeps the own brand ahead of a competitor with the same name", () => {
    expect(
      geoAnswerMentionTerms({
        companyName: "Resend",
        aliases: ["resend.com"],
        mentionedCompetitors: ["Resend", "Postmark"],
        trackedCompetitors: [{ name: "Postmark", synonyms: ["Postmark App"] }],
      })
    ).toEqual([
      { phrase: "Resend", kind: "own" },
      { phrase: "resend.com", kind: "own" },
      { phrase: "Postmark", kind: "competitor" },
      { phrase: "Postmark App", kind: "competitor" },
    ]);
  });

  test("drops blank and one-character phrases", () => {
    expect(
      geoAnswerMentionTerms({
        companyName: "A",
        aliases: [" ", "OK"],
        mentionedCompetitors: [""],
      })
    ).toEqual([{ phrase: "OK", kind: "own" }]);
  });
});

describe("geoAnswerMentionSpans", () => {
  const terms = geoAnswerMentionTerms({
    companyName: "Resend",
    mentionedCompetitors: ["Postmark", "Post"],
  });

  test("highlights own and competitor names without eating a longer match", () => {
    expect(
      geoAnswerMentionSpans(
        "Resend vs Postmark: Postmark is stronger at scale than Post.",
        terms
      )
    ).toEqual([
      { start: 0, end: 6, kind: "own" },
      { start: 10, end: 18, kind: "competitor" },
      { start: 20, end: 28, kind: "competitor" },
      { start: 55, end: 59, kind: "competitor" },
    ]);
  });

  test("is case-insensitive and skips names inside longer words", () => {
    expect(
      geoAnswerMentionSpans("Resending mail with resend still wins.", terms)
    ).toEqual([{ start: 20, end: 26, kind: "own" }]);
  });

  test("returns nothing when there is nothing to mark", () => {
    expect(geoAnswerMentionSpans("SendGrid is another option.", terms)).toEqual(
      []
    );
  });
});
