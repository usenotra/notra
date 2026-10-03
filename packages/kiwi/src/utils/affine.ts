import {
  IDENTITY_AFFINE,
  SVG_TRANSFORM_FN_RE,
  SVG_TRANSFORM_NUM_RE,
} from "../constants/svg-clip";
import type { Affine } from "../types/svg-clip";
import type { PathPoint } from "../types/svg-path";

export function multiplyAffine(m1: Affine, m2: Affine): Affine {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

export function applyAffine(m: Affine, p: PathPoint): PathPoint {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

function translation(x: number, y: number): Affine {
  return { ...IDENTITY_AFFINE, e: x, f: y };
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function transformFunction(name: string, nums: number[]): Affine | null {
  if (nums.length === 0) {
    return null;
  }
  switch (name) {
    case "matrix": {
      const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = nums;
      return nums.length === 6 ? { a, b, c, d, e, f } : null;
    }
    case "translate": {
      const [x = 0, y = 0] = nums;
      return translation(x, y);
    }
    case "scale": {
      const [sx = 1, sy = sx] = nums;
      return { ...IDENTITY_AFFINE, a: sx, d: sy };
    }
    case "rotate": {
      const [degrees = 0, cx = 0, cy = 0] = nums;
      const rad = degreesToRadians(degrees);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rotation = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
      return multiplyAffine(
        translation(cx, cy),
        multiplyAffine(rotation, translation(-cx, -cy))
      );
    }
    case "skewx":
      return {
        ...IDENTITY_AFFINE,
        c: Math.tan(degreesToRadians(nums[0] ?? 0)),
      };
    case "skewy":
      return {
        ...IDENTITY_AFFINE,
        b: Math.tan(degreesToRadians(nums[0] ?? 0)),
      };
    default:
      return null;
  }
}

export function parseSvgTransformAttr(value: string | null): Affine {
  let acc = IDENTITY_AFFINE;
  for (const [, name = "", args = ""] of (value ?? "").matchAll(
    SVG_TRANSFORM_FN_RE
  )) {
    const nums = (args.match(SVG_TRANSFORM_NUM_RE) ?? []).map(Number);
    const next = transformFunction(name.toLowerCase(), nums);
    if (next) {
      acc = multiplyAffine(acc, next);
    }
  }
  return acc;
}

export function svgTransformBetween(
  child: Element,
  container: Element,
  includeContainerTransform = true
): Affine {
  const chain: Element[] = includeContainerTransform ? [container] : [];
  const descendants: Element[] = [];
  for (
    let node: Element | null = child;
    node && node !== container;
    node = node.parentElement
  ) {
    descendants.unshift(node);
  }
  return [...chain, ...descendants].reduce(
    (acc, el) =>
      multiplyAffine(acc, parseSvgTransformAttr(el.getAttribute("transform"))),
    IDENTITY_AFFINE
  );
}
