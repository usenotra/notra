import { GEOMETRY_EPSILON, RECT_CLIP_TOLERANCE } from "../constants/svg-clip";
import type { ClipBounds } from "../types/svg-clip";
import type { PathPoint, PathSubpath } from "../types/svg-path";

export function subpathBounds(subpaths: PathSubpath[]): ClipBounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const sub of subpaths) {
    for (const p of sub.points) {
      if (!(Number.isFinite(p.x) && Number.isFinite(p.y))) {
        continue;
      }
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

export function signedSubpathArea(sub: PathSubpath): number {
  let sum = 0;
  for (const [i, p] of sub.points.entries()) {
    const q = sub.points[(i + 1) % sub.points.length] ?? p;
    sum += p.x * q.y - q.x * p.y;
  }
  return sum / 2;
}

export function isRectClip(subpaths: PathSubpath[]): boolean {
  const [sub] = subpaths;
  if (subpaths.length !== 1 || !sub?.closed || sub.points.length !== 4) {
    return false;
  }
  const axisAligned = sub.points.every((p, i) => {
    const q = sub.points[(i + 1) % sub.points.length] ?? p;
    return (
      Math.abs(p.x - q.x) <= RECT_CLIP_TOLERANCE ||
      Math.abs(p.y - q.y) <= RECT_CLIP_TOLERANCE
    );
  });
  const bounds = subpathBounds(subpaths);
  if (!(axisAligned && bounds)) {
    return false;
  }
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  return (
    width > 0 &&
    height > 0 &&
    Math.abs(Math.abs(signedSubpathArea(sub)) - width * height) <=
      RECT_CLIP_TOLERANCE * (width + height)
  );
}

export function withWinding(sub: PathSubpath, positive: boolean): PathSubpath {
  const area = signedSubpathArea(sub);
  if (area === 0 || area > 0 === positive) {
    return sub;
  }
  return { closed: sub.closed, points: [...sub.points].reverse() };
}

function isFillContour(sub: PathSubpath): boolean {
  return sub.closed && sub.points.length >= 3;
}

export function normalizeChildWinding(subs: PathSubpath[]): PathSubpath[] {
  let dominantArea = 0;
  for (const sub of subs.filter(isFillContour)) {
    const area = signedSubpathArea(sub);
    if (Math.abs(area) > Math.abs(dominantArea)) {
      dominantArea = area;
    }
  }
  if (dominantArea >= 0) {
    return subs;
  }
  return subs.map((sub) =>
    isFillContour(sub)
      ? { closed: sub.closed, points: [...sub.points].reverse() }
      : sub
  );
}

export function clipSubpathToRect(
  sub: PathSubpath,
  bounds: ClipBounds
): PathSubpath | null {
  if (!isFillContour(sub)) {
    return null;
  }
  const atX = (edge: number, a: PathPoint, b: PathPoint): PathPoint => {
    const t = b.x === a.x ? 0 : (edge - a.x) / (b.x - a.x);
    return { x: edge, y: a.y + t * (b.y - a.y) };
  };
  const atY = (edge: number, a: PathPoint, b: PathPoint): PathPoint => {
    const t = b.y === a.y ? 0 : (edge - a.y) / (b.y - a.y);
    return { x: a.x + t * (b.x - a.x), y: edge };
  };
  const clipEdge = (
    pts: PathPoint[],
    inside: (p: PathPoint) => boolean,
    intersect: (a: PathPoint, b: PathPoint) => PathPoint
  ): PathPoint[] => {
    const out: PathPoint[] = [];
    for (const [i, cur] of pts.entries()) {
      const prev = pts[(i + pts.length - 1) % pts.length] ?? cur;
      if (inside(cur) !== inside(prev)) {
        out.push(intersect(prev, cur));
      }
      if (inside(cur)) {
        out.push(cur);
      }
    }
    return out;
  };
  let pts = clipEdge(
    sub.points,
    (p) => p.x >= bounds.minX,
    (a, b) => atX(bounds.minX, a, b)
  );
  pts = clipEdge(
    pts,
    (p) => p.x <= bounds.maxX,
    (a, b) => atX(bounds.maxX, a, b)
  );
  pts = clipEdge(
    pts,
    (p) => p.y >= bounds.minY,
    (a, b) => atY(bounds.minY, a, b)
  );
  pts = clipEdge(
    pts,
    (p) => p.y <= bounds.maxY,
    (a, b) => atY(bounds.maxY, a, b)
  );
  return pts.length >= 3 ? { closed: true, points: pts } : null;
}

function turnArea(a: PathPoint, b: PathPoint, c: PathPoint): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

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
  if ([d1, d2, d3, d4].some((d) => Math.abs(d) <= eps)) {
    return false;
  }
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0;
}

export function isConvexSubpath(sub: PathSubpath): boolean {
  const pts = sub.points;
  const bounds = subpathBounds([sub]);
  if (!(isFillContour(sub) && bounds)) {
    return false;
  }
  const at = (i: number): PathPoint => pts[i % pts.length] ?? { x: 0, y: 0 };
  const extent = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const eps = GEOMETRY_EPSILON * Math.max(extent * extent, 1e-24);
  let sign = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const t = turnArea(at(i), at(i + 1), at(i + 2));
    if (Math.abs(t) <= eps) {
      continue;
    }
    const s = Math.sign(t);
    if (sign !== 0 && s !== sign) {
      return false;
    }
    sign = s;
  }
  if (sign === 0) {
    return false;
  }
  for (let i = 0; i < pts.length; i += 1) {
    for (let k = 0; k < pts.length; k += 1) {
      if (k === i || k === (i + 1) % pts.length) {
        continue;
      }
      const t = turnArea(at(i), at(i + 1), at(k));
      if (sign > 0 ? t < -eps : t > eps) {
        return false;
      }
    }
  }
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 2; j < pts.length; j += 1) {
      const adjacent = i === 0 && j === pts.length - 1;
      if (!adjacent && segmentsCross(at(i), at(i + 1), at(j), at(j + 1), eps)) {
        return false;
      }
    }
  }
  return true;
}

function dedupePoints(points: PathPoint[]): PathPoint[] {
  const cleaned: PathPoint[] = [];
  for (const p of points) {
    const prev = cleaned.at(-1);
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) >= GEOMETRY_EPSILON) {
      cleaned.push({ x: p.x, y: p.y });
    }
  }
  const first = cleaned[0];
  const last = cleaned.at(-1);
  if (
    cleaned.length >= 2 &&
    first &&
    last &&
    Math.hypot(first.x - last.x, first.y - last.y) < GEOMETRY_EPSILON
  ) {
    cleaned.pop();
  }
  return cleaned;
}

function inTriangle(
  p: PathPoint,
  a: PathPoint,
  b: PathPoint,
  c: PathPoint
): boolean {
  const turns = [turnArea(p, a, b), turnArea(p, b, c), turnArea(p, c, a)];
  const hasNeg = turns.some((t) => t < -GEOMETRY_EPSILON);
  const hasPos = turns.some((t) => t > GEOMETRY_EPSILON);
  return !(hasNeg && hasPos);
}

export function triangulateSubpath(sub: PathSubpath): PathSubpath[] {
  const cleaned = dedupePoints(sub.points);
  if (!sub.closed || cleaned.length < 3) {
    return [];
  }
  if (cleaned.length === 3) {
    return [{ closed: true, points: cleaned }];
  }
  const positive = signedSubpathArea({ closed: true, points: cleaned }) >= 0;
  const idx = cleaned.map((_, i) => i);
  const wrap = (k: number): number =>
    ((k % idx.length) + idx.length) % idx.length;
  const at = (k: number): PathPoint =>
    cleaned[idx[wrap(k)] ?? 0] ?? { x: 0, y: 0 };
  const triangle = (k: number): PathSubpath => ({
    closed: true,
    points: [at(k), at(k + 1), at(k + 2)].map((p) => ({ x: p.x, y: p.y })),
  });
  const out: PathSubpath[] = [];
  let guard = idx.length * idx.length;
  let k = 0;
  while (idx.length > 3 && guard > 0) {
    guard -= 1;
    const a = at(k);
    const b = at(k + 1);
    const c = at(k + 2);
    const ear = turnArea(a, b, c);
    const reflex = positive
      ? ear <= GEOMETRY_EPSILON
      : ear >= -GEOMETRY_EPSILON;
    const earVertices = [wrap(k), wrap(k + 1), wrap(k + 2)];
    const blocked =
      reflex ||
      idx.some(
        (_, j) => !earVertices.includes(j) && inTriangle(at(j), a, b, c)
      );
    if (blocked) {
      k += 1;
      continue;
    }
    out.push(triangle(k));
    idx.splice(wrap(k + 1), 1);
  }
  if (
    idx.length === 3 &&
    Math.abs(turnArea(at(0), at(1), at(2))) > GEOMETRY_EPSILON
  ) {
    out.push(triangle(0));
    return out;
  }
  return [{ closed: true, points: cleaned }];
}

export function convexContours(subs: PathSubpath[]): PathSubpath[] {
  return subs.flatMap((sub) => {
    const contour =
      !sub.closed && sub.points.length >= 3 ? { ...sub, closed: true } : sub;
    if (!contour.closed || isConvexSubpath(contour)) {
      return [contour];
    }
    const positive = signedSubpathArea(contour) >= 0;
    return triangulateSubpath(contour).map((t) => withWinding(t, positive));
  });
}

function segmentQuad(a: PathPoint, b: PathPoint, half: number): PathSubpath {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = ((b.x - a.x) / length) * half;
  const uy = ((b.y - a.y) / length) * half;
  return withWinding(
    {
      closed: true,
      points: [
        { x: a.x - ux - uy, y: a.y - uy + ux },
        { x: b.x + ux - uy, y: b.y + uy + ux },
        { x: b.x + ux + uy, y: b.y + uy - ux },
        { x: a.x - ux + uy, y: a.y - uy - ux },
      ],
    },
    true
  );
}

export function strokeOutline(
  subs: PathSubpath[],
  width: number
): PathSubpath[] {
  return subs.flatMap((sub) => {
    const [first] = sub.points;
    const points = sub.closed && first ? [...sub.points, first] : sub.points;
    return points.slice(1).flatMap((b, i) => {
      const a = points[i];
      return a && (a.x !== b.x || a.y !== b.y)
        ? [segmentQuad(a, b, width / 2)]
        : [];
    });
  });
}
