import { describe, expect, test } from "bun:test";

import {
  TRAFFIC_HERO_FRAME_CLASS,
  TRAFFIC_HERO_METRICS_GRID_CLASS,
} from "@/constants/geo-traffic-hero";

describe("traffic hero layout", () => {
  test("sizes the metric grid from the card width, not the viewport", () => {
    expect(TRAFFIC_HERO_FRAME_CLASS).toContain("@container/hero");
    expect(TRAFFIC_HERO_METRICS_GRID_CLASS).toContain("grid-cols-1");
    expect(TRAFFIC_HERO_METRICS_GRID_CLASS).toContain("@sm/hero:grid-cols-2");
    expect(TRAFFIC_HERO_METRICS_GRID_CLASS).toContain("@3xl/hero:grid-cols-4");
    expect(TRAFFIC_HERO_METRICS_GRID_CLASS).not.toContain("lg:grid-cols-4");
  });
});
