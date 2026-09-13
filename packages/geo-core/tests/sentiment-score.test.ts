import { expect, test } from "bun:test";

import {
  exactSentimentExcerpt,
  sentimentFamilyScore,
  sentimentPoints,
  sentimentScore,
  summarizeSentiment,
} from "../src/utils/geo-sentiment";

test("sentiment score uses 100/50/0 and preserves positive-share compatibility", () => {
  expect(sentimentScore({ positive: 1, neutral: 0, negative: 0 })).toBe(100);
  expect(sentimentScore({ positive: 0, neutral: 1, negative: 0 })).toBe(50);
  expect(sentimentScore({ positive: 0, neutral: 0, negative: 1 })).toBe(0);
  expect(sentimentScore({ positive: 3, neutral: 2, negative: 1 })).toBeCloseTo(
    200 / 3
  );
  const summary = summarizeSentiment([
    {
      positive: 3,
      neutral: 2,
      negative: 1,
      mentions: 8,
      totalChecks: 12,
      lastCheckedAt: null,
    },
  ]);
  expect(summary.score).toBeCloseTo(200 / 3);
  expect(summary.positiveShare).toBe(0.5);
  expect(summary.unknownMentions).toBe(2);
});

test("empty, non-mentioned and unknown-only buckets have no score; calendar gaps stay null", () => {
  expect(summarizeSentiment([]).score).toBeNull();
  expect(
    summarizeSentiment([
      {
        positive: 0,
        neutral: 0,
        negative: 0,
        mentions: 3,
        totalChecks: 7,
        lastCheckedAt: null,
      },
    ]).score
  ).toBeNull();
  const base = {
    positive: 0,
    neutral: 0,
    negative: 1,
    mentions: 1,
    totalChecks: 1,
    lastCheckedAt: null,
    engine: "openai/gpt-4.1-nano",
  };
  expect(
    sentimentPoints([
      { ...base, day: "2026-09-01" },
      { ...base, positive: 1, negative: 0, day: "2026-09-03" },
    ]).map((p) => p.score)
  ).toEqual([0, null, 100]);
});

test("engine families combine counts, not model scores, and exclude other families", () => {
  const base = {
    mentions: 10,
    totalChecks: 10,
    lastCheckedAt: null,
    neutral: 0,
  };
  const rows = [
    { ...base, engine: "openai/gpt-4.1-nano", positive: 9, negative: 1 },
    {
      ...base,
      mentions: 1,
      totalChecks: 1,
      engine: "openai/gpt-5.4-nano",
      positive: 0,
      negative: 1,
    },
    {
      ...base,
      engine: "google/gemini-2.5-flash-lite",
      positive: 10,
      negative: 0,
    },
  ];
  expect(sentimentFamilyScore(rows, "openai")).toBeCloseTo(900 / 11);
  expect(sentimentFamilyScore(rows, "gemini")).toBe(100);
  expect(sentimentFamilyScore(rows, "claude")).toBeNull();
});

test("excerpt emphasis accepts only an exact contiguous substring", () => {
  const answer =
    "First paragraph. CedarDesk is good, but expensive. Final paragraph.";
  expect(
    exactSentimentExcerpt(answer, "CedarDesk is good, but expensive.")
  ).toBe("CedarDesk is good, but expensive.");
  expect(
    exactSentimentExcerpt(answer, "CedarDesk is good... Final paragraph.")
  ).toBeNull();
  expect(exactSentimentExcerpt(answer, "cedardesk is good")).toBeNull();
  expect(exactSentimentExcerpt(answer, " ")).toBeNull();
  expect(
    exactSentimentExcerpt(
      "Literal <script>alert(1)</script>",
      "<script>alert(1)</script>"
    )
  ).toBe("<script>alert(1)</script>");
});
