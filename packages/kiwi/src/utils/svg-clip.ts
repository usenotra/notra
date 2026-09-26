import type { PathPoint, PathSubpath } from "./svg-path";

// Fallback policy (issue #386 / NOT-75):
// - clipPath with path/rect (userSpaceOnUse) -> real Figma clipping:
//   rect clips become a clipping Frame, path clips become a mask Vector.
// - <mask> -> approximated as an alpha clip when its content units are
//   userSpaceOnUse; luminance masks degrade to alpha.
// - filters -> feDropShadow / CSS drop-shadow(...) become DROP_SHADOW
//   effects and blur becomes a layer blur; anything else is skipped.
// - mix-blend-mode -> mapped when Figma has the same mode, else NORMAL.

const CLIP_URL_RE = /url\(\s*["']?#([^"')\s]+)["']?\s*\)/i;

export function parseClipRef(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === "none") {
    return null;
  }
  const match = CLIP_URL_RE.exec(trimmed);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

const BLEND_MODE_MAP: Record<string, string> = {
  normal: "NORMAL",
  multiply: "MULTIPLY",
  screen: "SCREEN",
  overlay: "OVERLAY",
  darken: "DARKEN",
  lighten: "LIGHTEN",
  "color-dodge": "COLOR_DODGE",
  "color-burn": "COLOR_BURN",
  "hard-light": "HARD_LIGHT",
  "soft-light": "SOFT_LIGHT",
  difference: "DIFFERENCE",
  exclusion: "EXCLUSION",
  hue: "HUE",
  saturation: "SATURATION",
  color: "COLOR",
  luminosity: "LUMINOSITY",
  // CSS plus-lighter ≈ Figma LINEAR_DODGE (Figma BlendMode enum has LINEAR_DODGE).
  "plus-lighter": "LINEAR_DODGE",
};

export function normalizeBlendMode(value: string | null | undefined): string {
  const key = (value ?? "").trim().toLowerCase();
  return BLEND_MODE_MAP[key] ?? "NORMAL";
}

export function parseOpacityValue(
  value: string | null | undefined
): number | undefined {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    const parsed = Number.parseFloat(trimmed);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    return Math.max(0, Math.min(1, parsed / 100));
  }
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.max(0, Math.min(1, parsed));
}

export interface ClipBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function subpathBounds(subpaths: PathSubpath[]): ClipBounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const sub of subpaths) {
    for (const p of sub.points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        continue;
      }
      if (p.x < minX) {
        minX = p.x;
      }
      if (p.y < minY) {
        minY = p.y;
      }
      if (p.x > maxX) {
        maxX = p.x;
      }
      if (p.y > maxY) {
        maxY = p.y;
      }
    }
  }
  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

function isClosedRectLoop(
  points: Array<{ x: number; y: number }>,
  tolerance = 0.5
): ClipBounds | null {
  if (points.length !== 4) {
    return null;
  }
  // Edges in path order (including the closing edge) must be axis-aligned;
  // a corner-set match alone also accepts bow-ties, whose fill is not the rect.
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    if (!p || !q) {
      return null;
    }
    if (Math.abs(p.x - q.x) > tolerance && Math.abs(p.y - q.y) > tolerance) {
      return null;
    }
  }
  const [a, b, c, d] = points;
  if (!a || !b || !c || !d) {
    return null;
  }
  const xs = [a.x, b.x, c.x, d.x];
  const ys = [a.y, b.y, c.y, d.y];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const corners = [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
  ];
  const used = new Set<number>();
  for (const p of points) {
    let hit = -1;
    for (let i = 0; i < corners.length; i += 1) {
      const corner = corners[i];
      if (!corner || used.has(i)) {
        continue;
      }
      if (
        Math.abs(p.x - (corner[0] ?? 0)) <= tolerance &&
        Math.abs(p.y - (corner[1] ?? 0)) <= tolerance
      ) {
        hit = i;
        break;
      }
    }
    if (hit === -1) {
      return null;
    }
    used.add(hit);
  }
  if (maxX - minX <= 0 || maxY - minY <= 0) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

/** A clip is a "rect clip" when it is exactly one closed 4-point loop forming an axis-aligned rect. */
export function rectClipBounds(subpaths: PathSubpath[]): ClipBounds | null {
  if (subpaths.length !== 1) {
    return null;
  }
  const sub = subpaths[0];
  if (!sub || sub.closed !== true) {
    return null;
  }
  return isClosedRectLoop(sub.points);
}

const CSS_LENGTH_RE = /^(-?\d*\.?\d+(?:[eE][+-]?\d+)?)(px)?$/;

function parseCssLength(token: string | undefined): number | null {
  if (!token) {
    return null;
  }
  const match = CSS_LENGTH_RE.exec(token.trim());
  if (!match?.[1]) {
    return null;
  }
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface ParsedDropShadow {
  dx: number;
  dy: number;
  blur: number;
  color: string | null;
}

/**
 * Parse one CSS `drop-shadow(dx dy blur color)` argument list.
 * Color may lead or trail (CSS allows both); returns null when unmappable.
 */
export function parseDropShadowArgs(args: string): ParsedDropShadow | null {
  const parts = args.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  // Fast path: dx dy [blur] [color]
  const dxFast = parseCssLength(parts[0]);
  const dyFast = parseCssLength(parts[1]);
  if (dxFast !== null && dyFast !== null) {
    let blur = 0;
    let color: string | null = null;
    const rest = parts.slice(2);
    if (rest.length > 0) {
      const maybeBlur = parseCssLength(rest[0]);
      if (maybeBlur !== null) {
        blur = Math.max(0, maybeBlur);
        color = rest.slice(1).join(" ") || null;
      } else {
        color = rest.join(" ") || null;
      }
    }
    return { dx: dxFast, dy: dyFast, blur, color };
  }
  // Slow path: leading color, e.g. `drop-shadow(red 2px 4px)`.
  // Find the first two consecutive lengths; tokens before are the color.
  for (let k = 0; k + 1 < parts.length; k += 1) {
    const dx = parseCssLength(parts[k]);
    const dy = parseCssLength(parts[k + 1]);
    if (dx === null || dy === null) {
      continue;
    }
    const leading = parts.slice(0, k).join(" ") || null;
    const rest = parts.slice(k + 2);
    let blur = 0;
    let trailingColor: string | null = null;
    if (rest.length > 0) {
      const maybeBlur = parseCssLength(rest[0]);
      if (maybeBlur !== null) {
        blur = Math.max(0, maybeBlur);
        trailingColor = rest.slice(1).join(" ") || null;
      } else {
        trailingColor = rest.join(" ") || null;
      }
    }
    if (leading && trailingColor) {
      return null;
    }
    return { dx, dy, blur, color: leading ?? trailingColor };
  }
  return null;
}

export interface ParsedCssFilter {
  dropShadows: ParsedDropShadow[];
  blur: number | null;
}

/** Split a CSS `filter` value into top-level `name(args)` functions, handling nested parens. */
function splitCssFunctions(
  value: string
): Array<{ name: string; args: string }> {
  const out: Array<{ name: string; args: string }> = [];
  let i = 0;
  while (i < value.length) {
    while (i < value.length && /\s/.test(value[i] ?? "")) {
      i += 1;
    }
    const nameStart = i;
    while (i < value.length && /[a-zA-Z-]/.test(value[i] ?? "")) {
      i += 1;
    }
    const name = value.slice(nameStart, i);
    while (i < value.length && /\s/.test(value[i] ?? "")) {
      i += 1;
    }
    if (!name || value[i] !== "(") {
      i += 1;
      continue;
    }
    i += 1; // consume (
    let depth = 1;
    const argsStart = i;
    while (i < value.length && depth > 0) {
      const c = value[i];
      if (c === "(") {
        depth += 1;
      } else if (c === ")") {
        depth -= 1;
      }
      i += 1;
    }
    if (depth === 0) {
      out.push({ name, args: value.slice(argsStart, i - 1) });
    }
  }
  return out;
}

/** Parse a CSS `filter` value, keeping only what maps to Figma effects.
 * Stacked `blur()`s keep only the first (documented approximation). */
export function parseCssFilter(
  value: string | null | undefined
): ParsedCssFilter {
  const out: ParsedCssFilter = { dropShadows: [], blur: null };
  if (!value || value.trim() === "" || value.trim() === "none") {
    return out;
  }
  for (const fn of splitCssFunctions(value)) {
    const name = fn.name.toLowerCase();
    const args = fn.args;
    if (name === "drop-shadow") {
      const parsed = parseDropShadowArgs(args);
      if (parsed) {
        out.dropShadows.push(parsed);
      }
    } else if (name === "blur" && out.blur === null) {
      const radius = parseCssLength(args.trim());
      if (radius !== null) {
        out.blur = Math.max(0, radius);
      }
    }
  }
  return out;
}

export interface Affine {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY_AFFINE: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** m1 * m2 (apply m2, then m1). */
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

export function applyAffine(
  m: Affine,
  p: { x: number; y: number }
): { x: number; y: number } {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

const SVG_TRANSFORM_FN_RE = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
const SVG_TRANSFORM_NUM_RE = /-?\d*\.?\d+(?:[eE][+-]?\d+)?/g;

function transformNumbers(args: string): number[] {
  const out: number[] = [];
  let m: RegExpExecArray | null;
  SVG_TRANSFORM_NUM_RE.lastIndex = 0;
  while ((m = SVG_TRANSFORM_NUM_RE.exec(args)) !== null) {
    const n = Number.parseFloat(m[0]);
    if (Number.isFinite(n)) {
      out.push(n);
    }
  }
  SVG_TRANSFORM_NUM_RE.lastIndex = 0;
  return out;
}

/**
 * Parse an SVG `transform` attribute into an affine matrix.
 * Supports matrix/translate/scale/rotate/skewX/skewY; unknown functions are ignored.
 */
export function parseSvgTransformAttr(
  value: string | null | undefined
): Affine {
  if (!value || value.trim() === "") {
    return { ...IDENTITY_AFFINE };
  }
  let acc: Affine = { ...IDENTITY_AFFINE };
  let m: RegExpExecArray | null;
  SVG_TRANSFORM_FN_RE.lastIndex = 0;
  while ((m = SVG_TRANSFORM_FN_RE.exec(value)) !== null) {
    const name = (m[1] ?? "").toLowerCase();
    const nums = transformNumbers(m[2] ?? "");
    let next: Affine | null = null;
    if (name === "matrix" && nums.length === 6) {
      const [a, b, c, d, e, f] = nums as [
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      next = { a, b, c, d, e, f };
    } else if (name === "translate" && nums.length >= 1) {
      next = { ...IDENTITY_AFFINE, e: nums[0] ?? 0, f: nums[1] ?? 0 };
    } else if (name === "scale" && nums.length >= 1) {
      const sx = nums[0] ?? 1;
      next = { ...IDENTITY_AFFINE, a: sx, d: nums[1] ?? sx };
    } else if (name === "rotate" && nums.length >= 1) {
      const rad = ((nums[0] ?? 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rot: Affine = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
      if (nums.length >= 3) {
        const cx = nums[1] ?? 0;
        const cy = nums[2] ?? 0;
        next = multiplyAffine(
          { ...IDENTITY_AFFINE, e: cx, f: cy },
          multiplyAffine(rot, { ...IDENTITY_AFFINE, e: -cx, f: -cy })
        );
      } else {
        next = rot;
      }
    } else if (name === "skewx" && nums.length >= 1) {
      next = {
        ...IDENTITY_AFFINE,
        c: Math.tan(((nums[0] ?? 0) * Math.PI) / 180),
      };
    } else if (name === "skewy" && nums.length >= 1) {
      next = {
        ...IDENTITY_AFFINE,
        b: Math.tan(((nums[0] ?? 0) * Math.PI) / 180),
      };
    }
    if (next) {
      acc = multiplyAffine(acc, next);
    }
  }
  SVG_TRANSFORM_FN_RE.lastIndex = 0;
  return acc;
}

/** Signed polygon area (shoelace); sign encodes winding orientation. */
export function signedSubpathArea(sub: PathSubpath): number {
  let sum = 0;
  const pts = sub.points;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    if (!p || !q) {
      continue;
    }
    sum += p.x * q.y - q.x * p.y;
  }
  return sum / 2;
}

/**
 * Return the subpath with the requested winding orientation (reverses point
 * order when needed). Mask cutouts must wind opposite to the filled contours
 * so they punch holes under the NONZERO rule.
 */
export function withWinding(sub: PathSubpath, positive: boolean): PathSubpath {
  const area = signedSubpathArea(sub);
  if (area === 0) {
    return sub;
  }
  const isPositive = area > 0;
  if (isPositive === positive) {
    return sub;
  }
  return { closed: sub.closed, points: [...sub.points].reverse() };
}

/**
 * Local transform from a clip/mask container's user space to a descendant
 * child (accumulates `transform` attributes from container down to child).
 * Ancestors above the container (defs etc.) are intentionally excluded:
 * userSpaceOnUse clip content lives in the referencing element's user space.
 *
 * Pass includeContainerTransform: false when the container is the root <svg>:
 * its CTM already carries the root transform, so counting it here would apply
 * it twice.
 */
export function clipLocalMatrix(
  child: Element,
  container: Element,
  includeContainerTransform = true
): Affine {
  const chain: Element[] = [];
  let node: Element | null = child;
  while (node && node !== container) {
    chain.unshift(node);
    node = node.parentElement;
  }
  if (includeContainerTransform) {
    chain.unshift(container);
  }
  let acc: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  for (const el of chain) {
    acc = multiplyAffine(
      acc,
      parseSvgTransformAttr(el.getAttribute("transform"))
    );
  }
  return acc;
}

/**
 * Intersect a closed polygon subpath with an axis-aligned rect
 * (Sutherland–Hodgman). Returns null when nothing survives. Mask cutouts are
 * clipped to the lit bounds so a dark shape hanging over the edge cannot add
 * fill outside the mask.
 */
export function clipSubpathToRect(
  sub: PathSubpath,
  bounds: ClipBounds
): PathSubpath | null {
  if (!sub.closed || sub.points.length < 3) {
    return null;
  }
  const vIntersect = (edge: number, a: PathPoint, b: PathPoint): PathPoint => {
    const t = b.x === a.x ? 0 : (edge - a.x) / (b.x - a.x);
    return { x: edge, y: a.y + t * (b.y - a.y) };
  };
  const hIntersect = (edge: number, a: PathPoint, b: PathPoint): PathPoint => {
    const t = b.y === a.y ? 0 : (edge - a.y) / (b.y - a.y);
    return { x: a.x + t * (b.x - a.x), y: edge };
  };
  const clipEdge = (
    pts: PathPoint[],
    inside: (p: PathPoint) => boolean,
    intersect: (a: PathPoint, b: PathPoint) => PathPoint
  ): PathPoint[] => {
    const out: PathPoint[] = [];
    for (let i = 0; i < pts.length; i += 1) {
      const cur = pts[i];
      const prev = pts[(i + pts.length - 1) % pts.length];
      if (!cur || !prev) {
        continue;
      }
      if (inside(cur)) {
        if (!inside(prev)) {
          out.push(intersect(prev, cur));
        }
        out.push(cur);
      } else if (inside(prev)) {
        out.push(intersect(prev, cur));
      }
    }
    return out;
  };
  let pts: PathPoint[] = sub.points.map((p) => ({ x: p.x, y: p.y }));
  pts = clipEdge(
    pts,
    (p) => p.x >= bounds.minX,
    (a, b) => vIntersect(bounds.minX, a, b)
  );
  pts = clipEdge(
    pts,
    (p) => p.x <= bounds.maxX,
    (a, b) => vIntersect(bounds.maxX, a, b)
  );
  pts = clipEdge(
    pts,
    (p) => p.y >= bounds.minY,
    (a, b) => hIntersect(bounds.minY, a, b)
  );
  pts = clipEdge(
    pts,
    (p) => p.y <= bounds.maxY,
    (a, b) => hIntersect(bounds.maxY, a, b)
  );
  if (pts.length < 3) {
    return null;
  }
  return { closed: true, points: pts };
}

/** Signed doubled area of triangle (a, b, c); sign encodes turn direction. */
function turnArea(a: PathPoint, b: PathPoint, c: PathPoint): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Largest bbox dimension; used to scale geometric tolerances. */
function polygonExtent(pts: PathPoint[]): number {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of pts) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      continue;
    }
    if (p.x < minX) {
      minX = p.x;
    }
    if (p.x > maxX) {
      maxX = p.x;
    }
    if (p.y < minY) {
      minY = p.y;
    }
    if (p.y > maxY) {
      maxY = p.y;
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return 0;
  }
  return Math.max(maxX - minX, maxY - minY, 0);
}

/** Proper intersection of open segments (touching at endpoints excluded). */
function segmentsCross(
  p: PathPoint,
  q: PathPoint,
  a: PathPoint,
  b: PathPoint,
  eps: number
): boolean {
  const d1 = turnArea(a, b, p);
  const d2 = turnArea(a, b, q);
  const d3 = turnArea(p, q, a);
  const d4 = turnArea(p, q, b);
  // Endpoint touches don't make a polygon non-simple on their own.
  if (
    Math.abs(d1) <= eps ||
    Math.abs(d2) <= eps ||
    Math.abs(d3) <= eps ||
    Math.abs(d4) <= eps
  ) {
    return false;
  }
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0;
}

/**
 * Whether a closed polygon is convex. Convex loops pass through to Figma
 * untouched; concave loops are triangulated because pasted concave contours
 * misrender.
 *
 * A same-sign turn test alone is not enough: self-intersecting contours such
 * as a pentagram also turn the same way at every vertex. Every other vertex
 * must additionally lie on the interior side of each directed edge, and no
 * two non-adjacent edges may properly cross. Tolerances scale with the
 * polygon extent so small-unit SVGs classify like large ones.
 */
export function isConvexSubpath(sub: PathSubpath): boolean {
  const pts = sub.points;
  if (!sub.closed || pts.length < 3) {
    return false;
  }
  const extent = polygonExtent(pts);
  const eps = 1e-9 * Math.max(extent * extent, 1e-24);
  let sign = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const r = pts[(i + 2) % pts.length];
    if (!p || !q || !r) {
      return false;
    }
    const t = turnArea(p, q, r);
    if (Math.abs(t) <= eps) {
      continue;
    }
    const s = t > 0 ? 1 : -1;
    if (sign === 0) {
      sign = s;
    } else if (s !== sign) {
      return false;
    }
  }
  if (sign === 0) {
    return false;
  }
  // Every vertex must sit on the interior side of every directed edge.
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (!a || !b) {
      return false;
    }
    for (let k = 0; k < pts.length; k += 1) {
      if (k === i || k === (i + 1) % pts.length) {
        continue;
      }
      const v = pts[k];
      if (!v) {
        return false;
      }
      const t = turnArea(a, b, v);
      if (sign > 0 ? t < -eps : t > eps) {
        return false;
      }
    }
  }
  // Reject self-intersecting loops (pentagram, bow-tie) whose turns still
  // agree in sign.
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    if (!p || !q) {
      return false;
    }
    for (let j = i + 2; j < pts.length; j += 1) {
      if (i === 0 && j === pts.length - 1) {
        continue;
      }
      const a = pts[j];
      const b = pts[(j + 1) % pts.length];
      if (!a || !b) {
        return false;
      }
      if (segmentsCross(p, q, a, b, eps)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Decompose a closed polygon into triangles (ear clipping). Output preserves
 * the input winding orientation. Returns the input unchanged when it is
 * already a triangle or when decomposition fails (never drop content).
 */
export function triangulateSubpath(sub: PathSubpath): PathSubpath[] {
  const cleaned: PathPoint[] = [];
  for (const p of sub.points) {
    const prev = cleaned.at(-1);
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) >= 1e-9) {
      cleaned.push({ x: p.x, y: p.y });
    }
  }
  if (cleaned.length >= 2) {
    const first = cleaned[0];
    const last = cleaned.at(-1);
    if (
      first &&
      last &&
      Math.hypot(first.x - last.x, first.y - last.y) < 1e-9
    ) {
      cleaned.pop();
    }
  }
  if (!sub.closed || cleaned.length < 3) {
    return [];
  }
  if (cleaned.length === 3) {
    return [{ closed: true, points: cleaned }];
  }
  const positive = signedSubpathArea({ closed: true, points: cleaned }) >= 0;
  const idx: number[] = cleaned.map((_, i) => i);
  const at = (k: number): PathPoint => {
    const p =
      cleaned[idx[((k % idx.length) + idx.length) % idx.length] ?? 0] ??
      cleaned[0];
    if (!p) {
      return { x: 0, y: 0 };
    }
    return p;
  };
  const inTriangle = (
    p: PathPoint,
    a: PathPoint,
    b: PathPoint,
    c: PathPoint
  ): boolean => {
    const d1 = turnArea(p, a, b);
    const d2 = turnArea(p, b, c);
    const d3 = turnArea(p, c, a);
    const hasNeg = d1 < -1e-9 || d2 < -1e-9 || d3 < -1e-9;
    const hasPos = d1 > 1e-9 || d2 > 1e-9 || d3 > 1e-9;
    return !(hasNeg && hasPos);
  };
  const out: PathSubpath[] = [];
  let guard = idx.length * idx.length;
  let k = 0;
  while (idx.length > 3 && guard > 0) {
    guard -= 1;
    const a = at(k);
    const b = at(k + 1);
    const c = at(k + 2);
    const ear = turnArea(a, b, c);
    if ((positive && ear <= 1e-9) || (!positive && ear >= -1e-9)) {
      k += 1;
      continue;
    }
    // Exclusion uses wrapped indices: k grows unboundedly while j spans the
    // live list, so raw k would stop matching the ear's own vertices.
    const e0 = k % idx.length;
    const e1 = (k + 1) % idx.length;
    const e2 = (k + 2) % idx.length;
    let blocked = false;
    for (let j = 0; j < idx.length; j += 1) {
      if (j === e0 || j === e1 || j === e2) {
        continue;
      }
      if (inTriangle(at(j), a, b, c)) {
        blocked = true;
        break;
      }
    }
    if (blocked) {
      k += 1;
      continue;
    }
    out.push({
      closed: true,
      points: [a, b, c].map((p) => ({ x: p.x, y: p.y })),
    });
    idx.splice((k + 1) % idx.length, 1);
  }
  if (idx.length === 3) {
    const a = at(0);
    const b = at(1);
    const c = at(2);
    if (Math.abs(turnArea(a, b, c)) > 1e-9) {
      out.push({
        closed: true,
        points: [a, b, c].map((p) => ({ x: p.x, y: p.y })),
      });
      return out;
    }
  }
  // Degenerate input: keep the original contour instead of losing content.
  return [{ closed: true, points: cleaned }];
}
