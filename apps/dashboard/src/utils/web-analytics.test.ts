import { expect, test } from "bun:test";

import { GEO_MAX_RANGE_DAYS } from "@notra/geo-core/constants/geo";
import type { WebAnalyticsResponse } from "@notra/geo-core/types/geo";
import { trafficSparklineDays } from "@notra/geo-core/utils/ai-traffic";

import {
  buildWebTrendRows,
  hasWebAnalytics,
  webSourceName,
} from "./web-analytics";

test.each([
  [undefined, undefined],
  ["2026-10-01", "2026-10-04"],
  ["invalid", "2026-10-04"],
  ["2026-10-04", "2026-10-01"],
  ["2020-01-01", "2030-01-01"],
] as const)(
  "web day inputs preserve the old synthetic domain for %s/%s",
  (from, to) => {
    const web = [
      { day: "2026-10-01 12:00:00", views: 3, visitors: 2 },
      { day: "2026-10-01", views: 2, visitors: 1 },
    ];
    const ai = [
      {
        day: "2026-10-03",
        visitorType: "crawler" as const,
        source: "openai",
        visits: 7,
      },
      {
        day: "2026-10-04",
        visitorType: "ai_referral" as const,
        source: "openai",
        visits: 9,
      },
    ];
    for (const webPoints of [[], web]) {
      for (const aiPoints of [[], ai]) {
        const oldDays = trafficSparklineDays(
          [
            ...aiPoints,
            ...webPoints.map((point) => ({
              day: point.day,
              visitorType: "human" as const,
              source: "",
              visits: point.views,
            })),
          ],
          from,
          to
        );
        const rows = buildWebTrendRows(webPoints, aiPoints, "de", from, to);
        expect(rows.map((row) => row.rawDay)).toEqual(oldDays);
        expect(rows.length).toBeLessThanOrEqual(GEO_MAX_RANGE_DAYS);
        for (const row of rows) {
          expect(row.people).toBe(
            webPoints.length && row.rawDay === "2026-10-01" ? 5 : 0
          );
          expect(row.agents).toBe(
            aiPoints.length && row.rawDay === "2026-10-03" ? 7 : 0
          );
        }
      }
    }
  }
);

function analytics(views: number): WebAnalyticsResponse {
  return {
    configured: true,
    hosts: [{ host: "example.com", siteId: "", views: 10 }],
    totals: {
      views,
      previousViews: 10,
      visitors: views,
      previousVisitors: 10,
      sessions: views,
      previousSessions: 10,
      engagedSessions: 0,
      aiVisitors: 0,
      previousAiVisitors: 0,
    },
    points: [],
    pages: [],
    sources: [],
    countries: [],
    devices: [],
    outcomes: [],
  };
}

test("visitor statistics appear only with views in the selected scope", () => {
  expect(hasWebAnalytics(undefined)).toBe(false);
  expect(hasWebAnalytics(analytics(0))).toBe(false);
  expect(hasWebAnalytics(analytics(1))).toBe(true);
});

test("unlisted referrer names never resolve through the object prototype", () => {
  for (const source of ["constructor", "__proto__", "toString"]) {
    expect(
      webSourceName(
        {
          group: "other",
          source,
          aiProduct: "",
          sessions: 1,
          previousSessions: 0,
          visitors: 1,
        },
        "Direct"
      )
    ).toBe(source);
  }
});
