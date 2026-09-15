import { describe, expect, test } from "bun:test";

import {
  TRAFFIC_HERO_CHART_SURFACE_CLASS,
  TRAFFIC_HERO_FRAME_CLASS,
  TRAFFIC_HERO_METRICS_GRID_CLASS,
  TRAFFIC_HERO_METRICS_SURFACE_CLASS,
} from "@/constants/geo-traffic-hero";

describe("traffic hero layout", () => {
  test("sizes the metric grid from the card width, not the viewport", () => {
    expect(TRAFFIC_HERO_FRAME_CLASS).toContain("@container/hero");
    expect(TRAFFIC_HERO_METRICS_GRID_CLASS).toContain("grid-cols-1");
    expect(TRAFFIC_HERO_METRICS_GRID_CLASS).toContain("@sm/hero:grid-cols-2");
    expect(TRAFFIC_HERO_METRICS_GRID_CLASS).toContain("@3xl/hero:grid-cols-4");
    expect(TRAFFIC_HERO_METRICS_GRID_CLASS).not.toContain("lg:grid-cols-4");
  });

  test("uses the dashboard dual-tone stacked surface", () => {
    expect(TRAFFIC_HERO_METRICS_SURFACE_CLASS).toContain("bg-muted");
    expect(TRAFFIC_HERO_METRICS_SURFACE_CLASS).toContain("rounded-t-2xl");
    expect(TRAFFIC_HERO_CHART_SURFACE_CLASS).toContain("bg-card");
    expect(TRAFFIC_HERO_CHART_SURFACE_CLASS).toContain("-mt-5");
    expect(TRAFFIC_HERO_CHART_SURFACE_CLASS).toContain("rounded-2xl");
  });
});
