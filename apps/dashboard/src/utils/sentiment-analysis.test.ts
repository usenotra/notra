import { expect, test } from "bun:test";

import type { SentimentAnalysisState } from "@notra/geo-core/types/sentiment-analysis";

import {
  sentimentAnalysisInterval,
  sentimentAnalysisStatus,
} from "./sentiment-analysis";

test("only pending and stale analysis keep polling for automatic work", () => {
  for (const status of ["ready", "failed", "unavailable"] as const) {
    expect(
      sentimentAnalysisInterval({ status, result: null, message: null })
    ).toBe(false);
  }
  expect(sentimentAnalysisInterval()).toBe(false);
  expect(
    sentimentAnalysisInterval({
      status: "pending",
      result: null,
      message: null,
    })
  ).toBe(3000);
  expect(
    sentimentAnalysisInterval({ status: "stale", result: null, message: null })
  ).toBe(30_000);
});

test("pending and retained stale results have explicit status copy", () => {
  const state: SentimentAnalysisState = {
    status: "stale",
    message: null,
    result: {
      fingerprint: "old",
      generatedAt: "2026-09-01",
      sampled: 1,
      eligible: 1,
      themes: [],
    },
  };
  expect(sentimentAnalysisStatus(state)).toContain("Showing previous themes");
  expect(sentimentAnalysisStatus({ ...state, status: "pending" })).toBe(
    "Analyzing saved answers…"
  );
  expect(sentimentAnalysisStatus({ ...state, status: "failed" })).toContain(
    "Analysis failed"
  );
  expect(
    sentimentAnalysisStatus({ ...state, status: "unavailable" })
  ).toContain("unavailable");
});
