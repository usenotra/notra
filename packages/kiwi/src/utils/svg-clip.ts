import { SVG_GEOMETRY_SELECTOR } from "../constants/dom-to-scene";
import {
  CLIP_CHILD_PAINT,
  CLIP_FINGERPRINT_DIGITS,
  DEFAULT_STROKE_WIDTH,
  MASK_DARK_LUMINANCE,
} from "../constants/svg-clip";
import type { SvgClip, SvgShape } from "../types/dom-to-scene";
import type {
  Affine,
  ClipChildSource,
  ClipRef,
  ClipSource,
  MaskPaint,
  StyleGetter,
} from "../types/svg-clip";
import type { PathSubpath } from "../types/svg-path";
import { applyAffine, multiplyAffine, svgTransformBetween } from "./affine";
import { parseColor } from "./css-color";
import { parseCssLength, parseOpacityValue, parseUrlRef } from "./css-value";
import {
  clipSubpathToRect,
  convexContours,
  normalizeChildWinding,
  strokeOutline,
  subpathBounds,
  withWinding,
} from "./polygon";
import { svgPrimitiveAttrs, svgPrimitiveToSubpaths } from "./svg-primitive";

export function createStyleCache(): StyleGetter {
  const cache = new Map<Element, CSSStyleDeclaration>();
  return (el) => {
    let style = cache.get(el);
    if (!style) {
      style = getComputedStyle(el);
      cache.set(el, style);
    }
    return style;
  };
}

export function svgClipRefs(
  el: Element,
  svg: SVGSVGElement,
  getStyle: StyleGetter
): ClipRef[] {
  const clips: ClipRef[] = [];
  const masks: ClipRef[] = [];
  for (
    let node: Element | null = el;
    node && node !== svg;
    node = node.parentElement
  ) {
    const style = getStyle(node);
    const clipId =
      parseUrlRef(node.getAttribute("clip-path")) ??
      parseUrlRef(style.getPropertyValue("clip-path"));
    if (clipId) {
      clips.unshift({ id: clipId, ref: node });
    }
    const maskId =
      parseUrlRef(node.getAttribute("mask")) ??
      parseUrlRef(style.getPropertyValue("mask-image")) ??
      parseUrlRef(style.getPropertyValue("mask"));
    if (maskId) {
      masks.unshift({ id: maskId, ref: node });
    }
  }
  return [
    ...clips,
    ...masks.filter((mask) => !clips.some((clip) => clip.id === mask.id)),
  ];
}

function isEvenOddClipChild(
  child: Element,
  container: Element,
  getStyle: StyleGetter
): boolean {
  const style = getStyle(child);
  return [
    child.getAttribute("fill-rule"),
    child.getAttribute("clip-rule"),
    container.getAttribute("fill-rule"),
    container.getAttribute("clip-rule"),
    style.getPropertyValue("fill-rule"),
    style.getPropertyValue("clip-rule"),
  ].some((value) => value?.trim() === "evenodd");
}

function computedOpacity(
  el: Element,
  style: CSSStyleDeclaration,
  property: string
): number {
  return (
    parseOpacityValue(style.getPropertyValue(property)) ??
    parseOpacityValue(el.getAttribute(property)) ??
    1
  );
}

function maskChildOpacity(
  child: Element,
  container: Element,
  getStyle: StyleGetter
): number {
  let opacity = 1;
  for (
    let node: Element | null = child;
    node && node !== container;
    node = node.parentElement
  ) {
    opacity *= computedOpacity(node, getStyle(node), "opacity");
  }
  return opacity;
}

function isPaintable(paint: string): boolean {
  return paint !== "none" && !paint.startsWith("url(");
}

function maskPaintFor(
  paint: string,
  alpha: number,
  strokeWidth: number | null
): MaskPaint {
  const [r, g, b, a] = parseColor(paint) ?? [1, 1, 1, 1];
  const paintAlpha = a * alpha;
  if (paintAlpha <= 0) {
    return { tone: "skip", alpha: 0, strokeWidth };
  }
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return {
    tone: luminance < MASK_DARK_LUMINANCE ? "dark" : "light",
    alpha: luminance * paintAlpha,
    strokeWidth,
  };
}

function maskPaint(
  child: Element,
  container: Element,
  getStyle: StyleGetter
): MaskPaint {
  const style = getStyle(child);
  const opacity = maskChildOpacity(child, container, getStyle);
  const fill = (
    child.getAttribute("fill") ?? style.getPropertyValue("fill")
  ).trim();
  if (isPaintable(fill)) {
    return maskPaintFor(
      fill,
      opacity * computedOpacity(child, style, "fill-opacity"),
      null
    );
  }
  const stroke = (
    child.getAttribute("stroke") ?? style.getPropertyValue("stroke")
  ).trim();
  const strokeWidth =
    parseCssLength(
      child.getAttribute("stroke-width") ??
        style.getPropertyValue("stroke-width")
    ) ?? DEFAULT_STROKE_WIDTH;
  if (!stroke || !isPaintable(stroke) || strokeWidth <= 0) {
    return { tone: "skip", alpha: 0, strokeWidth: null };
  }
  return maskPaintFor(
    stroke,
    opacity * computedOpacity(child, style, "stroke-opacity"),
    strokeWidth
  );
}

export function collectSvgClipSources(
  svg: SVGSVGElement,
  getStyle: StyleGetter
): Map<string, ClipSource> {
  const sources = new Map<string, ClipSource>();
  for (const container of svg.querySelectorAll("clipPath, mask")) {
    const id = container.getAttribute("id");
    const kind = container.tagName.toLowerCase() === "mask" ? "mask" : "clip";
    const unitsAttr = kind === "mask" ? "maskContentUnits" : "clipPathUnits";
    if (
      !id ||
      sources.has(id) ||
      container.getAttribute(unitsAttr)?.trim() === "objectBoundingBox"
    ) {
      continue;
    }
    const children: ClipChildSource[] = [];
    for (const child of container.querySelectorAll(SVG_GEOMETRY_SELECTOR)) {
      const paint =
        kind === "mask"
          ? maskPaint(child, container, getStyle)
          : CLIP_CHILD_PAINT;
      if (paint.tone === "skip") {
        continue;
      }
      const geometry = svgPrimitiveToSubpaths(
        child.tagName.toLowerCase(),
        svgPrimitiveAttrs(child)
      );
      const subs =
        paint.strokeWidth === null
          ? geometry
          : strokeOutline(geometry, paint.strokeWidth);
      if (subs.length === 0) {
        continue;
      }
      children.push({
        el: child,
        subs,
        evenOdd:
          kind === "clip" && isEvenOddClipChild(child, container, getStyle),
        dark: paint.tone === "dark",
        alpha: paint.alpha,
      });
    }
    if (children.length > 0) {
      sources.set(id, { id, kind, container, children });
    }
  }
  return sources;
}

function affineFingerprint(m: Affine): string {
  return [m.a, m.b, m.c, m.d, m.e, m.f]
    .map((n) => n.toFixed(CLIP_FINGERPRINT_DIGITS))
    .join(",");
}

function mapClipChild(
  child: ClipChildSource,
  container: Element,
  root: Affine,
  ref: Affine
): PathSubpath[] {
  const total = multiplyAffine(
    root,
    multiplyAffine(ref, svgTransformBetween(child.el, container))
  );
  return child.subs.map((sub) => ({
    closed: sub.closed,
    points: sub.points.map((p) => applyAffine(total, p)),
  }));
}

function maskSubpaths(
  source: ClipSource,
  map: (child: ClipChildSource) => PathSubpath[]
): PathSubpath[] {
  const lit = convexContours(
    source.children
      .filter((child) => !child.dark)
      .flatMap((child) => normalizeChildWinding(map(child)))
  );
  const litBounds = subpathBounds(lit);
  if (!litBounds) {
    return lit;
  }
  const cuts = source.children
    .filter((child) => child.dark)
    .flatMap(map)
    .flatMap((dark) => {
      const cut = clipSubpathToRect(dark, litBounds);
      return cut ? [withWinding(cut, false)] : [];
    });
  return [...lit, ...convexContours(cuts)];
}

export function resolveClip(
  source: ClipSource,
  ref: Element,
  svg: SVGSVGElement,
  root: Affine,
  resolved: Map<string, SvgClip>
): string | null {
  const refMatrix = svgTransformBetween(ref, svg, false);
  const key = `${source.id}|${affineFingerprint(refMatrix)}`;
  if (resolved.has(key)) {
    return key;
  }
  const map = (child: ClipChildSource): PathSubpath[] =>
    mapClipChild(child, source.container, root, refMatrix);
  const subpaths =
    source.kind === "clip"
      ? source.children.flatMap((child) =>
          convexContours(normalizeChildWinding(map(child)))
        )
      : maskSubpaths(source, map);
  if (subpaths.length === 0) {
    return null;
  }
  const evenOdd = source.children.some((child) => child.evenOdd);
  const opacity =
    source.kind === "mask"
      ? Math.max(
          0,
          ...source.children
            .filter((child) => !child.dark)
            .map((child) => child.alpha)
        )
      : 1;
  resolved.set(key, {
    id: key,
    subpaths,
    fillRule: evenOdd ? "evenodd" : "nonzero",
    opacity,
  });
  return key;
}

function shapeRunKey(shape: SvgShape): string {
  return `${shape.clipChain.join("|")}\n${shape.effectGroup ?? ""}`;
}

export function svgShapeRuns(shapes: SvgShape[]): SvgShape[][] {
  const runs: SvgShape[][] = [];
  for (const shape of shapes) {
    const run = runs.at(-1);
    const [first] = run ?? [];
    if (run && first && shapeRunKey(first) === shapeRunKey(shape)) {
      run.push(shape);
    } else {
      runs.push([shape]);
    }
  }
  return runs;
}
