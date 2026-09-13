import { describe, expect, test } from "bun:test";

import { SVG_GEOMETRY_SELECTOR } from "../src/constants/dom-to-scene";
import {
  svgPrimitiveToPathData,
  svgPrimitiveToSubpaths,
} from "../src/utils/svg-primitive";

function bounds(points: Array<{ x: number; y: number }>) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

describe("svg primitive imports (#388)", () => {
  test("geometry selector covers path + all six primitives", () => {
    for (const tag of [
      "path",
      "circle",
      "ellipse",
      "rect",
      "line",
      "polyline",
      "polygon",
    ]) {
      expect(SVG_GEOMETRY_SELECTOR.split(",").map((s) => s.trim())).toContain(
        tag
      );
    }
  });

  test("circle converts to a closed loop spanning its diameter", () => {
    const subpaths = svgPrimitiveToSubpaths("circle", {
      cx: "50",
      cy: "50",
      r: "10",
    });
    expect(subpaths).toHaveLength(1);
    const sub = subpaths[0];
    if (!sub) {
      throw new Error("expected one subpath");
    }
    expect(sub.closed).toBe(true);
    expect(sub.points.length).toBeGreaterThan(8);
    const b = bounds(sub.points);
    expect(b.minX).toBeCloseTo(40, 5);
    expect(b.maxX).toBeCloseTo(60, 5);
    expect(b.minY).toBeCloseTo(40, 5);
    expect(b.maxY).toBeCloseTo(60, 5);
  });

  test("ellipse converts to a closed loop with rx/ry extents", () => {
    const subpaths = svgPrimitiveToSubpaths("ellipse", {
      cx: "5",
      cy: "5",
      rx: "4",
      ry: "2",
    });
    expect(subpaths).toHaveLength(1);
    const sub = subpaths[0];
    if (!sub) {
      throw new Error("expected one subpath");
    }
    expect(sub.closed).toBe(true);
    const b = bounds(sub.points);
    expect(b.minX).toBeCloseTo(1, 5);
    expect(b.maxX).toBeCloseTo(9, 5);
    expect(b.minY).toBeCloseTo(3, 5);
    expect(b.maxY).toBeCloseTo(7, 5);
  });

  test("plain rect converts to four closed corners", () => {
    const subpaths = svgPrimitiveToSubpaths("rect", {
      x: "0",
      y: "0",
      width: "20",
      height: "10",
    });
    expect(subpaths).toHaveLength(1);
    const sub = subpaths[0];
    if (!sub) {
      throw new Error("expected one subpath");
    }
    expect(sub.closed).toBe(true);
    expect(sub.points).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 0, y: 10 },
    ]);
  });

  test("rounded rect stays closed and keeps more points than a plain rect", () => {
    const plain = svgPrimitiveToSubpaths("rect", {
      x: "0",
      y: "0",
      width: "20",
      height: "10",
    });
    const rounded = svgPrimitiveToSubpaths("rect", {
      x: "0",
      y: "0",
      width: "20",
      height: "10",
      rx: "2",
      ry: "2",
    });
    expect(rounded).toHaveLength(1);
    const roundedSub = rounded[0];
    const plainSub = plain[0];
    if (!roundedSub) {
      throw new Error("expected rounded subpath");
    }
    if (!plainSub) {
      throw new Error("expected plain subpath");
    }
    expect(roundedSub.closed).toBe(true);
    expect(roundedSub.points.length).toBeGreaterThan(plainSub.points.length);
    const b = bounds(roundedSub.points);
    expect(b.minX).toBeCloseTo(0, 5);
    expect(b.maxX).toBeCloseTo(20, 5);
    expect(b.minY).toBeCloseTo(0, 5);
    expect(b.maxY).toBeCloseTo(10, 5);
  });

  test("line converts to a single open segment", () => {
    const subpaths = svgPrimitiveToSubpaths("line", {
      x1: "0",
      y1: "0",
      x2: "10",
      y2: "10",
    });
    expect(subpaths).toHaveLength(1);
    const sub = subpaths[0];
    if (!sub) {
      throw new Error("expected one subpath");
    }
    expect(sub.closed).toBe(false);
    expect(sub.points).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]);
  });

  test("polyline stays open, polygon closes", () => {
    const open = svgPrimitiveToSubpaths("polyline", {
      points: "0,0 10,0 10,10",
    });
    expect(open).toHaveLength(1);
    const openSub = open[0];
    if (!openSub) {
      throw new Error("expected open subpath");
    }
    expect(openSub.closed).toBe(false);
    expect(openSub.points).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);

    const closed = svgPrimitiveToSubpaths("polygon", {
      points: "0,0 10,0 10,10",
    });
    expect(closed).toHaveLength(1);
    const closedSub = closed[0];
    if (!closedSub) {
      throw new Error("expected closed subpath");
    }
    expect(closedSub.closed).toBe(true);
    expect(closedSub.points).toEqual(openSub.points);
  });

  test("path data passes through, empty path drops", () => {
    expect(svgPrimitiveToPathData("path", { d: "M0 0L1 1" })).toBe("M0 0L1 1");
    expect(svgPrimitiveToPathData("path", { d: "  " })).toBeNull();
    expect(svgPrimitiveToSubpaths("path", { d: "" })).toEqual([]);
  });

  test("degenerate primitives are dropped instead of emitting empty geometry", () => {
    expect(svgPrimitiveToSubpaths("circle", { r: "0" })).toEqual([]);
    expect(svgPrimitiveToSubpaths("ellipse", { cx: "5", cy: "5" })).toEqual([]);
    expect(
      svgPrimitiveToSubpaths("rect", { width: "0", height: "10" })
    ).toEqual([]);
    expect(
      svgPrimitiveToSubpaths("line", { x1: "1", y1: "1", x2: "1", y2: "1" })
    ).toEqual([]);
    expect(svgPrimitiveToSubpaths("polyline", { points: "0,0" })).toEqual([]);
    expect(svgPrimitiveToSubpaths("polygon", { points: "" })).toEqual([]);
    expect(svgPrimitiveToSubpaths("use", {})).toEqual([]);
  });
});
