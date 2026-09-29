import { expect, test } from "bun:test";

import type { GeoTrafficPoint } from "../src/types/geo";
import {
  buildTrafficTrendRows,
  trafficSparklineDays,
} from "../src/utils/ai-traffic";

test("traffic starting today plots zero for earlier days in the selected range", () => {
  const points: GeoTrafficPoint[] = [
    {
      day: "2026-09-29",
      source: "GPTBot",
      visitorType: "crawler",
      visits: 3,
    },
  ];
  const days = trafficSparklineDays(points, "2026-09-26", "2026-09-29");
  const rows = buildTrafficTrendRows(points, "en-US", days);

  expect(rows.map((row) => row.rawDay)).toEqual([
    "2026-09-26",
    "2026-09-27",
    "2026-09-28",
    "2026-09-29",
  ]);
  expect(rows.map((row) => row.crawler)).toEqual([0, 0, 0, 3]);
  expect(rows.map((row) => row.aiReferral)).toEqual([0, 0, 0, 0]);
  expect(trafficSparklineDays([], "2026-09-26", "2026-09-29")).toEqual([]);
});

test("very long ranges sample empty days without dropping observed traffic", () => {
  const points: GeoTrafficPoint[] = [
    {
      day: "2026-09-29",
      source: "GPTBot",
      visitorType: "crawler",
      visits: 3,
    },
  ];
  const days = trafficSparklineDays(points, "0000-01-01", "9999-12-31");

  expect(days.length).toBeLessThanOrEqual(91);
  expect(days[0]).toBe("0000-01-01");
  expect(days.at(-1)).toBe("9999-12-31");
  expect(days).toContain("2026-09-29");
});
