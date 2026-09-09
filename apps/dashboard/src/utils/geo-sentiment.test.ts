import { expect, test } from "bun:test";

import { summarizeSentiment } from "@notra/geo-core/utils/geo-sentiment";

import { sentimentFamilyRows } from "./geo-sentiment";

test("family rows weight counts across models and search modes, preserving brand order", () => {
  const engines = [
    {
      engine: "google/gemini-2.5-flash-lite",
      positive: 10,
      neutral: 0,
      negative: 0,
    },
    { engine: "openai/gpt-4.1-nano", positive: 9, neutral: 0, negative: 1 },
    {
      engine: "openai/gpt-4.1-nano-grounded",
      positive: 0,
      neutral: 0,
      negative: 1,
    },
    {
      engine: "anthropic/claude-sonnet-4",
      positive: 0,
      neutral: 1,
      negative: 0,
    },
  ].map(({ engine, ...counts }) => ({
    engine,
    ...summarizeSentiment([
      { ...counts, mentions: 10, totalChecks: 10, lastCheckedAt: null },
    ]),
  }));
  const rows = sentimentFamilyRows(engines);
  expect(rows.map((row) => row.label)).toEqual(["ChatGPT", "Claude", "Gemini"]);
  expect(rows.map((row) => row.score)).toEqual([900 / 11, 50, 100]);
  expect(sentimentFamilyRows(engines.toReversed())).toEqual(rows);
});

test("unknown families sort by name, unrated is null and genuine negative is zero", () => {
  const empty = summarizeSentiment([
    {
      positive: 0,
      neutral: 0,
      negative: 0,
      mentions: 2,
      totalChecks: 3,
      lastCheckedAt: null,
    },
  ]);
  const negative = summarizeSentiment([
    {
      positive: 0,
      neutral: 0,
      negative: 1,
      mentions: 1,
      totalChecks: 1,
      lastCheckedAt: null,
    },
  ]);
  expect(
    sentimentFamilyRows([
      { ...negative, engine: "zzz-family" },
      { ...empty, engine: "aaa-family" },
    ])
  ).toEqual([
    { family: "aaa-family", label: "aaa-family", score: null },
    { family: "zzz-family", label: "zzz-family", score: 0 },
  ]);
  expect(sentimentFamilyRows([])).toEqual([]);
});
