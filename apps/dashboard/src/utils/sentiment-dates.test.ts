import { expect, test } from "bun:test";

import { formatSentimentPeriod } from "./sentiment-dates";

test("formats comparison windows without ISO dates or timezone labels", () => {
  const label = formatSentimentPeriod("2026-08-14", "2026-09-12");
  expect(label).toContain("Aug");
  expect(label).toContain("Sep");
  expect(label).not.toContain("2026-");
  expect(label).not.toContain("UTC");
});

test("retains both years for a window crossing New Year", () => {
  const label = formatSentimentPeriod("2025-12-20", "2026-01-18");
  expect(label).toContain("2025");
  expect(label).toContain("2026");
});
