import { describe, expect, test } from "bun:test";

import { normalizeLineValue } from "@/utils/echarts-line-values";

describe("ECharts line values", () => {
  test("preserves finite values and numeric input coercion", () => {
    expect(normalizeLineValue(0)).toBe(0);
    expect(normalizeLineValue(-4.5)).toBe(-4.5);
    expect(normalizeLineValue("12")).toBe(12);
  });

  test("turns missing and non-finite values into line gaps", () => {
    expect(normalizeLineValue(null)).toBeNull();
    expect(normalizeLineValue(undefined)).toBeNull();
    expect(normalizeLineValue(Number.NaN)).toBeNull();
    expect(normalizeLineValue(Number.POSITIVE_INFINITY)).toBeNull();
    expect(normalizeLineValue("not-a-number")).toBeNull();
    expect(normalizeLineValue(" ")).toBeNull();
    expect(normalizeLineValue(false)).toBeNull();
    expect(normalizeLineValue(Symbol("missing"))).toBeNull();
  });
});
