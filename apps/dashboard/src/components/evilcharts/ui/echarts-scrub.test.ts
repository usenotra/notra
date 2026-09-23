import { describe, expect, test } from "bun:test";

import {
  nearestCategoryIndex,
  yAtXOnPackedPoints,
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

describe("yAtXOnPackedPoints", () => {
  test("lerps between adjacent vertices", () => {
    expect(yAtXOnPackedPoints([0, 10, 10, 20], 5)).toBe(15);
    expect(yAtXOnPackedPoints([0, 10, 10, 20], 0)).toBe(10);
    expect(yAtXOnPackedPoints([0, 10, 10, 20], 10)).toBe(20);
  });

  test("holds at the ends and skips NaN gaps", () => {
    expect(yAtXOnPackedPoints([0, 4, 10, 8], -1)).toBe(4);
    expect(yAtXOnPackedPoints([0, 4, 10, 8], 11)).toBe(8);
    expect(yAtXOnPackedPoints([0, 4, Number.NaN, Number.NaN, 10, 12], 5)).toBe(
      12
    );
    expect(yAtXOnPackedPoints([], 0)).toBe(null);
  });
});
