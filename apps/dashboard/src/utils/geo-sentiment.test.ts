import { expect, test } from "bun:test";

import { summarizeSentiment } from "@notra/geo-core/utils/geo-sentiment";

import {
  isolatedSentimentPointIndices,
  sentimentEmptyMessageKey,
  sentimentHasDisplayableData,
  sentimentSummaryShowsEmpty,
  sentimentThemesState,
} from "./geo-sentiment";

test("a stale analysis keeps its themes on screen", () => {
  const summary = summarizeSentiment([
    {
      positive: 1,
      neutral: 0,
      negative: 0,
      mentions: 1,
      totalChecks: 1,
      lastCheckedAt: null,
    },
  ]);
  const view = sentimentThemesState({
    summary,
    isAnalyzing: false,
    isPending: false,
    isError: false,
    aggregatePending: false,
    state: {
      status: "stale",
      message: "Saved answers changed. Refresh the analysis.",
      result: {
        fingerprint: "day-1",
        generatedAt: "2026-09-21T00:00:00.000Z",
        sampled: 1,
        eligible: 1,
        themes: [
          {
            title: "Easy setup",
            polarity: "positive",
            evidence: [],
            claims: [],
          },
        ],
      },
    },
  });
  expect(view.showTable).toBe(true);
  expect(view.showResults).toBe(true);
  expect(view.showEmpty).toBe(false);
  expect(view.canAnalyze).toBe(true);
});

test("analysis in progress keeps existing themes and otherwise shows the analyzing state", () => {
  const base = {
    summary: summarizeSentiment([
      {
        positive: 1,
        neutral: 0,
        negative: 0,
        mentions: 1,
        totalChecks: 1,
        lastCheckedAt: null,
      },
    ]),
    isAnalyzing: false,
    isPending: false,
    isError: false,
    aggregatePending: false,
  };
  const pending = sentimentThemesState({
    ...base,
    state: { status: "pending", message: null, result: null },
  });
  expect(pending.pending).toBe(true);
  expect(pending.showTable).toBe(false);
  expect(pending.showEmpty).toBe(true);
  expect(pending.statusKey).toBe("finding");

  const withResults = sentimentThemesState({
    ...base,
    state: {
      status: "pending",
      message: null,
      result: {
        fingerprint: "day-1",
        generatedAt: "2026-09-21T00:00:00.000Z",
        sampled: 1,
        eligible: 1,
        themes: [
          {
            title: "Easy setup",
            polarity: "positive",
            evidence: [],
            claims: [],
          },
        ],
      },
    },
  });
  expect(withResults.pending).toBe(false);
  expect(withResults.showTable).toBe(true);
  expect(withResults.showEmpty).toBe(false);
});

test("lookup failures never render pending ghosts and configuration explanations survive empty aggregates", () => {
  const base = {
    summary: summarizeSentiment([]),
    isAnalyzing: false,
    isPending: false,
    isError: false,
    aggregatePending: false,
  };
  const unavailable = sentimentThemesState({
    ...base,
    state: {
      status: "unavailable",
      message: "Configure a company name in GEO settings.",
      result: null,
    },
  });
  expect(unavailable.message).toEqual({
    kind: "text",
    text: "Configure a company name in GEO settings.",
  });
  expect(unavailable.canAnalyze).toBe(false);
  const failed = sentimentThemesState({
    ...base,
    isError: true,
    aggregatePending: true,
    state: { status: "pending", message: null, result: null },
  });
  expect(failed.pending).toBe(false);
  expect(failed.showEmpty).toBe(false);
  expect(failed.showResults).toBe(false);
});

test("empty copy distinguishes absent answers from saved but unrated mentions", () => {
  expect(sentimentEmptyMessageKey(summarizeSentiment([]))).toBe(
    "noSavedAnswers"
  );
  expect(
    sentimentEmptyMessageKey(
      summarizeSentiment([
        {
          positive: 0,
          neutral: 0,
          negative: 0,
          mentions: 2,
          totalChecks: 3,
          lastCheckedAt: null,
        },
      ])
    )
  ).toBe("noRatedMentions");
});

test("available ratings remain visible when the selected range starts before rating history", () => {
  const summary = summarizeSentiment([
    {
      positive: 1,
      neutral: 0,
      negative: 0,
      mentions: 1,
      totalChecks: 10,
      lastCheckedAt: null,
    },
  ]);

  expect(sentimentHasDisplayableData(summary)).toBe(true);
  expect(sentimentSummaryShowsEmpty(summary)).toBe(false);
});

test("markers preserve isolated observations while contiguous series stay clean", () => {
  expect(
    isolatedSentimentPointIndices(
      [70, null, 80, 90, null, 0].map((score) => ({ score }))
    )
  ).toEqual([0, 5]);
  for (const scores of [
    [70, null, 80],
    [70, null, 80, 90],
    [70, 80, null, 90],
    [null, 70, null],
    [null, 0, null, 80, null],
    [70],
  ]) {
    expect(
      isolatedSentimentPointIndices(scores.map((score) => ({ score }))).length >
        0
    ).toBe(true);
  }
  for (const scores of [
    [],
    [null, null],
    [70, 80, 90],
    [null, 70, 80, null],
    [0, 0],
  ]) {
    expect(
      isolatedSentimentPointIndices(scores.map((score) => ({ score }))).length >
        0
    ).toBe(false);
  }
});
