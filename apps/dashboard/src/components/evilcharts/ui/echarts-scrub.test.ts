import { describe, expect, test } from "bun:test";

import {
  interpolateAt,
  nearestCategoryIndex,
} from "@/components/evilcharts/ui/echarts-scrub";

describe("nearestCategoryIndex", () => {
  test("clamps and rounds to a category slot", () => {
    expect(nearestCategoryIndex(-2, 5)).toBe(0);
    expect(nearestCategoryIndex(1.4, 5)).toBe(1);
    expect(nearestCategoryIndex(1.5, 5)).toBe(2);
    expect(nearestCategoryIndex(9, 5)).toBe(4);
    expect(nearestCategoryIndex(0, 0)).toBe(0);
  });
});

describe("interpolateAt", () => {
  test("lerps between adjacent samples", () => {
    expect(interpolateAt([0, 10, 20], 0.5)).toBe(5);
    expect(interpolateAt([0, 10, 20], 1.25)).toBe(12.5);
  });

  test("holds at the ends and skips nulls", () => {
    expect(interpolateAt([4, 8], -1)).toBe(4);
    expect(interpolateAt([4, 8], 3)).toBe(8);
    expect(interpolateAt([4, null, 12], 0.5)).toBe(4);
    expect(interpolateAt([null, 8], 0)).toBe(null);
    expect(interpolateAt([], 0)).toBe(null);
  });
});
