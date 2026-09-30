import type { PathSubpath } from "../types/svg-path";
import type { SvgPrimitiveAttrs } from "../types/svg-primitive";
import { parseSvgPath } from "./svg-path";

const NUM_RE = /-?\d*\.?\d+(?:[eE][+-]?\d+)?/g;

function attrNumber(value: string | null | undefined, fallback = 0): number {
  if (value == null || value === "") {
    return fallback;
  }
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function parsePoints(
  points: string | null | undefined
): Array<{ x: number; y: number }> {
  if (!points) {
    return [];
  }
  const nums: number[] = [];
  let m: RegExpExecArray | null = NUM_RE.exec(points);
  while (m) {
    nums.push(Number.parseFloat(m[0]));
    m = NUM_RE.exec(points);
  }
  NUM_RE.lastIndex = 0;
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (x === undefined || y === undefined) {
      continue;
    }
    out.push({ x, y });
  }
  return out;
}

function circlePath(attrs: SvgPrimitiveAttrs): string | null {
  const r = attrNumber(attrs.r);
  if (r <= 0) {
    return null;
  }
  const cx = attrNumber(attrs.cx);
  const cy = attrNumber(attrs.cy);
  return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
}

function ellipsePath(attrs: SvgPrimitiveAttrs): string | null {
  const hasRx = attrs.rx != null && attrs.rx !== "";
  const hasRy = attrs.ry != null && attrs.ry !== "";
  if (!(hasRx || hasRy)) {
    return null;
  }
  const rx = hasRx ? attrNumber(attrs.rx) : attrNumber(attrs.ry);
  const ry = hasRy ? attrNumber(attrs.ry) : attrNumber(attrs.rx);
  if (rx <= 0 || ry <= 0) {
    return null;
  }
  const cx = attrNumber(attrs.cx);
  const cy = attrNumber(attrs.cy);
  return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
}

function rectPath(attrs: SvgPrimitiveAttrs): string | null {
  const width = attrNumber(attrs.width);
  const height = attrNumber(attrs.height);
  if (width <= 0 || height <= 0) {
    return null;
  }
  const x = attrNumber(attrs.x);
  const y = attrNumber(attrs.y);
  const hasRx = attrs.rx != null && attrs.rx !== "";
  const hasRy = attrs.ry != null && attrs.ry !== "";
  let rx = 0;
  let ry = 0;
  if (hasRx || hasRy) {
    rx = Math.min(
      Math.abs(hasRx ? attrNumber(attrs.rx) : attrNumber(attrs.ry)),
      width / 2
    );
    ry = Math.min(
      Math.abs(hasRy ? attrNumber(attrs.ry) : attrNumber(attrs.rx)),
      height / 2
    );
  }
  if (rx === 0 || ry === 0) {
    return `M${x} ${y}H${x + width}V${y + height}H${x}Z`;
  }
  return `M${x + rx} ${y}H${x + width - rx}A${rx} ${ry} 0 0 1 ${x + width} ${y + ry}V${y + height - ry}A${rx} ${ry} 0 0 1 ${x + width - rx} ${y + height}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + height - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
}

function linePath(attrs: SvgPrimitiveAttrs): string | null {
  const x1 = attrNumber(attrs.x1);
  const y1 = attrNumber(attrs.y1);
  const x2 = attrNumber(attrs.x2);
  const y2 = attrNumber(attrs.y2);
  if (x1 === x2 && y1 === y2) {
    return null;
  }
  return `M${x1} ${y1}L${x2} ${y2}`;
}

function polyPath(attrs: SvgPrimitiveAttrs, closed: boolean): string | null {
  const pts = parsePoints(attrs.points);
  if (pts.length < 2) {
    return null;
  }
  const first = pts[0];
  if (!first) {
    return null;
  }
  let d = `M${first.x} ${first.y}`;
  for (let i = 1; i < pts.length; i += 1) {
    const p = pts[i];
    if (!p) {
      continue;
    }
    d += `L${p.x} ${p.y}`;
  }
  if (closed) {
    d += "Z";
  }
  return d;
}

export function svgPrimitiveToPathData(
  tag: string,
  attrs: SvgPrimitiveAttrs
): string | null {
  switch (tag) {
    case "path": {
      const d = attrs.d?.trim();
      return d ? d : null;
    }
    case "circle":
      return circlePath(attrs);
    case "ellipse":
      return ellipsePath(attrs);
    case "rect":
      return rectPath(attrs);
    case "line":
      return linePath(attrs);
    case "polyline":
      return polyPath(attrs, false);
    case "polygon":
      return polyPath(attrs, true);
    default:
      return null;
  }
}

export function svgPrimitiveToSubpaths(
  tag: string,
  attrs: SvgPrimitiveAttrs
): PathSubpath[] {
  const d = svgPrimitiveToPathData(tag, attrs);
  if (!d) {
    return [];
  }
  return parseSvgPath(d);
}

function svgLengthAttr(el: Element, name: string): string | null {
  const raw = el.getAttribute(name);
  if (!raw?.trim().endsWith("%")) {
    return raw;
  }
  const animated: unknown = Reflect.get(el, name);
  return animated instanceof SVGAnimatedLength
    ? String(animated.baseVal.value)
    : raw;
}

export function svgPrimitiveAttrs(el: Element): SvgPrimitiveAttrs {
  return {
    d: el.getAttribute("d"),
    cx: svgLengthAttr(el, "cx"),
    cy: svgLengthAttr(el, "cy"),
    r: svgLengthAttr(el, "r"),
    rx: svgLengthAttr(el, "rx"),
    ry: svgLengthAttr(el, "ry"),
    x: svgLengthAttr(el, "x"),
    y: svgLengthAttr(el, "y"),
    width: svgLengthAttr(el, "width"),
    height: svgLengthAttr(el, "height"),
    x1: svgLengthAttr(el, "x1"),
    y1: svgLengthAttr(el, "y1"),
    x2: svgLengthAttr(el, "x2"),
    y2: svgLengthAttr(el, "y2"),
    points: el.getAttribute("points"),
  };
}
