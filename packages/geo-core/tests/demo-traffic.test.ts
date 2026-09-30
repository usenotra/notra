import { describe, expect, test } from "bun:test";

import { queryDemoPipe } from "@notra/analytics/tinybird/demo-geo-traffic";

import { registerGeoDemoTraffic } from "../src/geo/demo-traffic";

registerGeoDemoTraffic();

const scope = { organization_id: "org-demo", project_id: "project-demo" };

function rows<T>(pipe: string, params: Record<string, unknown>): T[] {
  const result = queryDemoPipe<T>(pipe, { ...scope, ...params });
  if (!result) {
    throw new Error(`${pipe} is not mirrored`);
  }
  return result.data;
}

describe("demo GEO traffic pipes", () => {
  test("overview has current and previous periods", () => {
    const overview = rows<{ visits: number; previous_visits: number }>(
      "geo_traffic_overview",
      { days: 30 }
    );
    expect(overview.length).toBeGreaterThan(0);
    expect(overview.every((row) => row.visits > 0)).toBe(true);
    expect(overview.some((row) => row.previous_visits > 0)).toBe(true);
  });

  test("timeseries reaches today and never the future", () => {
    const today = new Date().toISOString().slice(0, 10);
    const series = rows<{ day: string }>("geo_traffic_timeseries", {
      days: 7,
    });
    expect(series.some((row) => row.day === today)).toBe(true);
    expect(series.every((row) => row.day <= today)).toBe(true);
  });

  test("log is newest first and respects the limit", () => {
    const log = rows<{ captured_at: string }>("geo_traffic_log", { limit: 10 });
    expect(log).toHaveLength(10);
    const sorted = [...log].sort((a, b) =>
      b.captured_at.localeCompare(a.captured_at)
    );
    expect(log).toEqual(sorted);
  });

  test("journey detail returns the events of one journey", () => {
    const [journey] = rows<{ journey_id: string; pages: number }>(
      "geo_traffic_journeys",
      { days: 30, limit: 1 }
    );
    expect(journey).toBeDefined();
    const events = rows<unknown>("geo_journey_detail", {
      days: 30,
      journey_id: journey?.journey_id,
    });
    expect(events).toHaveLength(journey?.pages ?? -1);
  });

  test("other pipes are not answered", () => {
    expect(queryDemoPipe("social_overview", scope)).toBeNull();
  });
});
