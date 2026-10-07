import { expect, test } from "bun:test";

import type { WebAnalyticsResponse } from "@notra/geo-core/types/geo";

import { hasWebAnalytics, webSourceName } from "./web-analytics";

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
