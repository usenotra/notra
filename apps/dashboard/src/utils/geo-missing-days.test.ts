import { expect, test } from "bun:test";

import { GEO_MENTION_TREND_TOTAL_KEY } from "@notra/geo-core/constants/geo";

import {
  buildEngineFamilyModeTrendRows,
  buildMentionTrendRows,
} from "./geo-charts";
import {
  buildGeoCompetitorPoints,
  competitorMentionStats,
} from "./geo-competitor";

const checks = [
  { day: "2026-09-20", engine: "openai/gpt-4o", checks: 5, mentions: 2 },
  { day: "2026-09-22", engine: "openai/gpt-4o", checks: 5, mentions: 0 },
];

test("visibility charts only plot scanned days, preserving real zero results", () => {
  const trend = buildMentionTrendRows(checks);
  expect(trend.rows.map((row) => row.rawDay)).toEqual([
    "2026-09-20",
    "2026-09-22",
  ]);
  expect(trend.rows.map((row) => row[GEO_MENTION_TREND_TOTAL_KEY])).toEqual([
    2, 0,
  ]);
  expect(buildMentionTrendRows(checks.slice(0, 1)).rows).toHaveLength(1);
  expect(
    buildEngineFamilyModeTrendRows(checks, "openai").map((row) => row.rawDay)
  ).toEqual(["2026-09-20", "2026-09-22"]);
});

test("competitor chart skips missed days but retains zero mentions on scanned days", () => {
  const points = buildGeoCompetitorPoints([
    { day: "2026-09-20", checks: 5, mentions: 2 },
    { day: "2026-09-22", checks: 5, mentions: 0 },
  ]);
  expect(points.map((point) => point.rawDay)).toEqual([
    "2026-09-20",
    "2026-09-22",
  ]);
  expect(competitorMentionStats(points)?.latest).toBe(0);
  expect(competitorMentionStats(points)?.peak).toBe(2);
});
