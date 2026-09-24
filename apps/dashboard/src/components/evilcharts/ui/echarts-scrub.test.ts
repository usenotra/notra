import { describe, expect, test } from "bun:test";

import {
  isScrubSkipSeries,
  nearestCategoryIndex,
  yAtXOnPackedPoints,
} from "@/components/evilcharts/ui/echarts-scrub";

const PREFIXES = ["__reveal-", "__mini-", "__loading"] as const;

describe("nearestCategoryIndex", () => {
  test("clamps and rounds to a category slot", () => {
    expect(nearestCategoryIndex(-2, 5)).toBe(0);
    expect(nearestCategoryIndex(1.4, 5)).toBe(1);
    expect(nearestCategoryIndex(1.5, 5)).toBe(2);
    expect(nearestCategoryIndex(9, 5)).toBe(4);
  });

  test("returns no index for an empty chart", () => {
    expect(nearestCategoryIndex(0, 0)).toBe(null);
    expect(nearestCategoryIndex(3, -1)).toBe(null);
  });
});

describe("yAtXOnPackedPoints", () => {
  test("lerps between adjacent vertices", () => {
    expect(yAtXOnPackedPoints([0, 10, 10, 20], 5)).toBe(15);
    expect(yAtXOnPackedPoints([0, 10, 10, 20], 0)).toBe(10);
    expect(yAtXOnPackedPoints([0, 10, 10, 20], 10)).toBe(20);
  });

  test("does not invent a y on a gap or before the first vertex", () => {
    expect(yAtXOnPackedPoints([0, 4, 10, 8], -1)).toBe(null);
    expect(yAtXOnPackedPoints([0, 4, Number.NaN, Number.NaN, 10, 12], 5)).toBe(
      null
    );
    expect(yAtXOnPackedPoints([], 0)).toBe(null);
  });

  test("holds the last vertex past the end", () => {
    expect(yAtXOnPackedPoints([0, 4, 10, 8], 11)).toBe(8);
  });
});

describe("isScrubSkipSeries", () => {
  test("skips generated companions and exact prefix ids", () => {
    expect(isScrubSkipSeries("__reveal-mentions", PREFIXES, ["mentions"])).toBe(
      true
    );
    expect(isScrubSkipSeries("__mini-mentions", PREFIXES, ["mentions"])).toBe(
      true
    );
    expect(isScrubSkipSeries("__loading", PREFIXES, ["mentions"])).toBe(true);
  });

  test("clips user series even when the key starts like a prefix", () => {
    expect(isScrubSkipSeries("__reveal-mentions", PREFIXES, ["other"])).toBe(
      false
    );
    expect(isScrubSkipSeries("mentions", PREFIXES, ["mentions"])).toBe(false);
  });
});
