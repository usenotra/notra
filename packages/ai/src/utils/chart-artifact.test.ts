import { expect, test } from "bun:test";

import {
  buildGeoCompetitorShareChart,
  buildGeoOverviewChart,
  buildGeoTimeseriesChart,
} from "./chart-artifact";

test("empty GEO windows emit an empty artifact instead of a vacant bar or pie", () => {
  expect(buildGeoOverviewChart({ days: 7, engines: [] })).toMatchObject({
    kind: "empty",
    title: "Mention rate by engine",
  });
  expect(
    buildGeoCompetitorShareChart({ days: 7, competitors: [] })
  ).toMatchObject({
    kind: "empty",
    title: "Competitor share of voice",
  });
  expect(buildGeoTimeseriesChart({ days: 7, points: [] })).toMatchObject({
    kind: "empty",
    title: "Mention rate trend",
  });
});

test("overview rates become a bar chart and timeseries becomes area", () => {
  const overview = buildGeoOverviewChart({
    days: 7,
    engines: [{ engine: "chatgpt-grounded", mention_rate: 0.4 }],
  });
  expect(overview).toMatchObject({
    kind: "bar",
    segments: [{ label: "chatgpt", value: 40 }],
  });

  const timeseries = buildGeoTimeseriesChart({
    days: 7,
    points: [
      { day: "2026-01-01", engine: "chatgpt-grounded", mention_rate: 0.2 },
    ],
  });
  expect(timeseries.kind).toBe("area");
});
