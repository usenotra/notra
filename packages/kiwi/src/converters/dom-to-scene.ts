import type { Font } from "opentype.js";

import {
  SceneBuilder,
  dropShadowEffect,
  layerBlurEffect,
  solidFill,
  transformAt,
} from "../builders/scene-builder";
import {
  HEX_RE,
  IGNORED_TAGS,
  LAYER_WORD_SPLIT_RE,
  MAX_LAYER_NAME_LENGTH,
  RGB_RE,
  SVG_GEOMETRY_SELECTOR,
  TEXT_ALIGN_MAP,
  WEIGHT_TO_STYLE,
  WHITESPACE_GLOBAL_RE,
  WHITESPACE_RE,
} from "../constants/dom-to-scene";
import { loadTextFont } from "../fonts/loader";
import type {
  BorderSide,
  BoxBorders,
  BuildSceneFromElementOptions,
  ElementInfo,
  LayoutNode,
  SvgClip,
  SvgEffectGroup,
  SvgInfo,
  SvgShape,
} from "../types/dom-to-scene";
import type { FigmaEffect, Guid, Transform } from "../types/scene";
import type { PathSubpath } from "../types/svg-path";
import { normalizeCssColorWithContext } from "../utils/css-color";
import {
  type Affine,
  applyAffine,
  clipLocalMatrix,
  clipSubpathToRect,
  isConvexSubpath,
  multiplyAffine,
  normalizeBlendMode,
  parseClipRef,
  parseCssFilter,
  parseOpacityValue,
  parseSvgTransformAttr,
  rectClipBounds,
  signedSubpathArea,
  subpathBounds,
  triangulateSubpath,
  withWinding,
} from "../utils/svg-clip";
import { svgPrimitiveToSubpaths } from "../utils/svg-primitive";
import { inlineSvgUses } from "../utils/svg-use";
import { TextLayoutCache } from "../utils/text-layout";

export type { BuildSceneFromElementOptions } from "../types/dom-to-scene";

const SVG_DASH_SEPARATOR_RE = /[\s,]+/;
const SVG_DASH_LENGTH_RE = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:px)?$/i;

let colorParseContext: CanvasRenderingContext2D | null | undefined;

function parseColorChannel(value: string): number {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    return Number.parseFloat(trimmed) / 100;
  }
  return Number.parseFloat(trimmed) / 255;
}

function parseAlphaChannel(value: string | undefined): number {
  if (value === undefined) {
    return 1;
  }
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    return Number.parseFloat(trimmed) / 100;
  }
  return Number.parseFloat(trimmed);
}

function normalizeCssColor(value: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  if (colorParseContext === undefined) {
    colorParseContext = document.createElement("canvas").getContext("2d");
  }
  if (!colorParseContext) {
    return null;
  }
  return normalizeCssColorWithContext(value, colorParseContext);
}

function parseKnownColor(s: string): [number, number, number, number] | null {
  const trimmed = s.trim();
  if (trimmed === "transparent") {
    return [0, 0, 0, 0];
  }
  const hex = HEX_RE.exec(trimmed);
  if (hex?.[1]) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (h.length !== 6 && h.length !== 8) {
      return null;
    }
    const r = Number.parseInt(h.slice(0, 2), 16) / 255;
    const g = Number.parseInt(h.slice(2, 4), 16) / 255;
    const b = Number.parseInt(h.slice(4, 6), 16) / 255;
    const a = h.length === 8 ? Number.parseInt(h.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }
  const m = RGB_RE.exec(trimmed);
  const inner = m?.[1];
  if (!inner) {
    return null;
  }
  const parts = inner.includes(",")
    ? inner.split(",").map((p) => p.trim())
    : inner
        .replace(" / ", " ")
        .split(WHITESPACE_RE)
        .map((p) => p.trim());
  const [rs, gs, bs, as] = parts;
  if (rs === undefined || gs === undefined || bs === undefined) {
    return null;
  }
  const r = parseColorChannel(rs);
  const g = parseColorChannel(gs);
  const b = parseColorChannel(bs);
  const a = parseAlphaChannel(as);
  if (![r, g, b, a].every(Number.isFinite)) {
    return null;
  }
  return [r, g, b, a];
}

function parseColor(s: string): [number, number, number, number] | null {
  if (!s) {
    return null;
  }
  const trimmed = s.trim();
  const parsed = parseKnownColor(trimmed);
  if (parsed) {
    return parsed;
  }
  const normalized = normalizeCssColor(trimmed);
  if (!normalized || normalized === trimmed) {
    return null;
  }
  return parseKnownColor(normalized);
}

function svgPaintValue(
  value: string | null,
  inherited: string | null,
  currentColor: string
): string | null {
  const paint = (value ?? inherited ?? "").trim();
  if (!paint || paint === "none" || paint.startsWith("url(")) {
    return null;
  }
  if (paint === "currentColor") {
    return currentColor;
  }
  return paint;
}

function svgStrokeCap(value: string): string {
  switch (value.trim()) {
    case "round":
      return "ROUND";
    case "square":
      return "SQUARE";
    default:
      return "NONE";
  }
}

function svgStrokeJoin(value: string): string {
  switch (value.trim()) {
    case "round":
      return "ROUND";
    case "bevel":
      return "BEVEL";
    default:
      return "MITER";
  }
}

function svgGeometryAttrs(el: Element): {
  d: string | null;
  cx: string | null;
  cy: string | null;
  r: string | null;
  rx: string | null;
  ry: string | null;
  x: string | null;
  y: string | null;
  width: string | null;
  height: string | null;
  x1: string | null;
  y1: string | null;
  x2: string | null;
  y2: string | null;
  points: string | null;
} {
  return {
    d: el.getAttribute("d"),
    cx: el.getAttribute("cx"),
    cy: el.getAttribute("cy"),
    r: el.getAttribute("r"),
    rx: el.getAttribute("rx"),
    ry: el.getAttribute("ry"),
    x: el.getAttribute("x"),
    y: el.getAttribute("y"),
    width: el.getAttribute("width"),
    height: el.getAttribute("height"),
    x1: el.getAttribute("x1"),
    y1: el.getAttribute("y1"),
    x2: el.getAttribute("x2"),
    y2: el.getAttribute("y2"),
    points: el.getAttribute("points"),
  };
}

type StyleGetter = (el: Element) => CSSStyleDeclaration | null;

function safeStyle(el: Element): CSSStyleDeclaration | null {
  try {
    return getComputedStyle(el);
  } catch {
    return null;
  }
}

function svgRootScreenAffine(svg: SVGSVGElement): Affine {
  try {
    const ctm = svg.getScreenCTM();
    if (ctm) {
      return { a: ctm.a, b: ctm.b, c: ctm.c, d: ctm.d, e: ctm.e, f: ctm.f };
    }
  } catch {
    // fall through to identity (detached DOM in tests)
  }
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

// clipPath/mask children are never rendered, so getScreenCTM() is null for
// them in browsers. Resolve geometry from attributes instead and map through
// the svg root CTM (which already includes viewBox + page layout), the
// referencing element's user-space transform (userSpaceOnUse clip content
// lives in the referencing element's user space), and the container→child
// `transform` attributes.
function mapClipChild(
  subs: PathSubpath[],
  child: Element,
  container: Element,
  root: Affine,
  ref: Affine
): PathSubpath[] {
  if (subs.length === 0) {
    return [];
  }
  const total = multiplyAffine(
    root,
    multiplyAffine(ref, clipLocalMatrix(child, container))
  );
  return subs.map((sub) => ({
    closed: sub.closed,
    points: sub.points.map((p) => applyAffine(total, p)),
  }));
}

function clipChildFillRule(
  child: Element,
  container: Element,
  getStyle: StyleGetter
): "nonzero" | "evenodd" {
  for (const v of [
    child.getAttribute("fill-rule"),
    child.getAttribute("clip-rule"),
    container.getAttribute("fill-rule"),
    container.getAttribute("clip-rule"),
  ]) {
    if ((v ?? "").trim() === "evenodd") {
      return "evenodd";
    }
  }
  const cs = getStyle(child);
  if (
    cs?.getPropertyValue("fill-rule").trim() === "evenodd" ||
    cs?.getPropertyValue("clip-rule").trim() === "evenodd"
  ) {
    return "evenodd";
  }
  return "nonzero";
}

interface ClipRef {
  id: string;
  /** Element whose clip-path/mask attribute references the id. */
  ref: Element;
}

function clipAttrRef(
  node: Element,
  style: CSSStyleDeclaration | null
): string | null {
  return (
    parseClipRef(node.getAttribute("clip-path")) ??
    (style
      ? (parseClipRef(style.getPropertyValue("clip-path")) ??
        parseClipRef(
          (style as unknown as { clipPath?: string }).clipPath ?? null
        ))
      : null)
  );
}

function maskAttrRef(
  node: Element,
  style: CSSStyleDeclaration | null
): string | null {
  return (
    parseClipRef(node.getAttribute("mask")) ??
    (style
      ? (parseClipRef(style.getPropertyValue("mask-image")) ??
        parseClipRef(style.getPropertyValue("mask")))
      : null)
  );
}

// clip-path accumulates through ancestors (outermost first), and so does
// mask: every self-or-ancestor mask applies, outermost first, after the
// clips. Each entry keeps its referencing element so clip geometry resolves
// in the referencing element's user space.
function svgClipRefs(
  el: Element,
  style: CSSStyleDeclaration | null,
  getStyle: StyleGetter = safeStyle
): ClipRef[] {
  const refs: ClipRef[] = [];
  const maskRefs: ClipRef[] = [];
  let node: Element | null = el;
  let first = true;
  while (node && node.tagName.toLowerCase() !== "svg") {
    // Passed style is the self element's computed style (avoids a recompute).
    const cs = first ? style : getStyle(node);
    first = false;
    if (node instanceof SVGGraphicsElement || node instanceof SVGGElement) {
      const clipId = clipAttrRef(node, cs);
      if (clipId) {
        refs.unshift({ id: clipId, ref: node });
      }
      const maskId = maskAttrRef(node, cs);
      if (maskId) {
        maskRefs.unshift({ id: maskId, ref: node });
      }
    } else if (node instanceof Element) {
      const clipId = parseClipRef(node.getAttribute("clip-path"));
      if (clipId) {
        refs.unshift({ id: clipId, ref: node });
      }
      const maskId = maskAttrRef(node, cs);
      if (maskId) {
        maskRefs.unshift({ id: maskId, ref: node });
      }
    }
    node = node.parentElement;
  }
  for (const maskRef of maskRefs) {
    if (!refs.some((r) => r.id === maskRef.id)) {
      refs.push(maskRef);
    }
  }
  return refs;
}

interface ClipChildSource {
  el: Element;
  /** Geometry in the container's local space (mapped per reference later). */
  subs: PathSubpath[];
  /** clipPath only: this child forces evenodd for the whole clip. */
  evenOdd: boolean;
  /** mask only: dark content cuts out instead of filling. */
  dark: boolean;
}

interface ClipSource {
  id: string;
  kind: "clip" | "mask";
  container: Element;
  children: ClipChildSource[];
}

// How one mask child contributes: gradients cannot be approximated and empty
// fills contribute nothing, so both are skipped; dark content cuts out.
function maskChildKind(
  child: Element,
  getStyle: StyleGetter
): "skip" | "light" | "dark" {
  let maskFill: string | null = child.getAttribute("fill");
  let fillOpacity = parseOpacityValue(child.getAttribute("fill-opacity"));
  let nodeOpacity = parseOpacityValue(child.getAttribute("opacity"));
  const cs = getStyle(child);
  if (cs) {
    maskFill ??= cs.getPropertyValue("fill") || null;
    fillOpacity ??= parseOpacityValue(cs.getPropertyValue("fill-opacity"));
    nodeOpacity ??= parseOpacityValue(cs.getPropertyValue("opacity"));
  }
  if (!maskFill || maskFill.trim() === "") {
    return "light";
  }
  const trimmed = maskFill.trim();
  if (trimmed === "none" || trimmed.startsWith("url(")) {
    return "skip";
  }
  const c = parseColor(trimmed);
  if (!c) {
    return "light";
  }
  const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const alpha = c[3] * (fillOpacity ?? 1) * (nodeOpacity ?? 1);
  if (alpha <= 0) {
    return "skip";
  }
  return lum < 0.5 ? "dark" : "light";
}

// Collect clip/mask content once per svg in container-local space. Screen
// mapping needs the referencing element's user space, which varies per
// reference, so mapping happens per shape in resolveClipKey.
function collectSvgClipSources(
  svg: SVGSVGElement,
  getStyle: StyleGetter = safeStyle
): Map<string, ClipSource> {
  const sources = new Map<string, ClipSource>();
  for (const clipEl of svg.querySelectorAll("clipPath")) {
    const id = clipEl.getAttribute("id");
    if (!id || sources.has(id)) {
      continue;
    }
    if (
      (clipEl.getAttribute("clipPathUnits") ?? "").trim() ===
      "objectBoundingBox"
    ) {
      // No userSpaceOnUse mapping: shapes using this clip render unclipped.
      continue;
    }
    const children: ClipChildSource[] = [];
    for (const child of clipEl.querySelectorAll(SVG_GEOMETRY_SELECTOR)) {
      if (!(child instanceof Element)) {
        continue;
      }
      const subs = svgPrimitiveToSubpaths(
        child.tagName.toLowerCase(),
        svgGeometryAttrs(child)
      );
      if (subs.length === 0) {
        continue;
      }
      children.push({
        el: child,
        subs,
        evenOdd: clipChildFillRule(child, clipEl, getStyle) === "evenodd",
        dark: false,
      });
    }
    if (children.length > 0) {
      sources.set(id, { id, kind: "clip", container: clipEl, children });
    }
  }
  // <mask> fallback: approximate as an alpha clip when content units allow it.
  // Luminance is NOT preserved: dark shapes become cutout holes (see
  // resolveClipKey) instead of unioning, which would invert them into solids.
  // ponytail: luminance threshold, full luminance-mask support if needed.
  for (const maskEl of svg.querySelectorAll("mask")) {
    const id = maskEl.getAttribute("id");
    if (!id || sources.has(id)) {
      continue;
    }
    if (
      (maskEl.getAttribute("maskContentUnits") ?? "").trim() ===
      "objectBoundingBox"
    ) {
      // No userSpaceOnUse mapping: shapes using this mask render unmasked.
      continue;
    }
    const children: ClipChildSource[] = [];
    for (const child of maskEl.querySelectorAll(SVG_GEOMETRY_SELECTOR)) {
      if (!(child instanceof Element)) {
        continue;
      }
      const kind = maskChildKind(child, getStyle);
      if (kind === "skip") {
        continue;
      }
      const subs = svgPrimitiveToSubpaths(
        child.tagName.toLowerCase(),
        svgGeometryAttrs(child)
      );
      if (subs.length === 0) {
        continue;
      }
      children.push({ el: child, subs, evenOdd: false, dark: kind === "dark" });
    }
    if (children.length > 0) {
      sources.set(id, { id, kind: "mask", container: maskEl, children });
    }
  }
  return sources;
}

function refMatrixFingerprint(m: Affine): string {
  const r = (n: number): number => Math.round(n * 1000) / 1000;
  return `${r(m.a)},${r(m.b)},${r(m.c)},${r(m.d)},${r(m.e)},${r(m.f)}`;
}

// Align one clip/mask child's contours so separate children union under
// NONZERO while holes survive: the dominant (largest-area) closed contour is
// made positive and every other closed contour in the same child is flipped
// with it, preserving their relative winding. Without this, forcing every
// contour positive turns an oppositely wound inner contour (a hole) solid.
function normalizeChildWinding(subs: PathSubpath[]): PathSubpath[] {
  let refArea = 0;
  let hasRef = false;
  for (const sub of subs) {
    if (!sub.closed || sub.points.length < 3) {
      continue;
    }
    const area = signedSubpathArea(sub);
    if (!hasRef || Math.abs(area) > Math.abs(refArea)) {
      refArea = area;
      hasRef = true;
    }
  }
  if (!hasRef || refArea >= 0) {
    return subs;
  }
  return subs.map((sub) =>
    sub.closed && sub.points.length >= 3
      ? { closed: sub.closed, points: [...sub.points].reverse() }
      : sub
  );
}

// Prepare clip/mask contours for emit: decompose concave loops into convex
// triangles, which pasted vectors render reliably. Convex loops pass through
// untouched. Relative winding is preserved so holes stay holes; callers align
// each child with normalizeChildWinding first.
function emitClipSubpaths(subs: PathSubpath[]): PathSubpath[] {
  const out: PathSubpath[] = [];
  for (const sub of subs) {
    // SVG fill semantics implicitly close open contours, so an open subpath
    // with at least three points is judged (and emitted) as closed.
    const contour =
      !sub.closed && sub.points.length >= 3
        ? { ...sub, closed: true as const }
        : sub;
    if (!contour.closed || isConvexSubpath(contour)) {
      out.push(contour);
    } else {
      const subPositive = signedSubpathArea(contour) >= 0;
      for (const t of triangulateSubpath(contour)) {
        out.push(withWinding(t, subPositive));
      }
    }
  }
  return out;
}

// Map one clip/mask source to screen space for a single referencing element
// and cache it. The cache key folds in the reference transform, so the same
// clip under different transformed ancestors resolves independently.
function resolveClipKey(
  source: ClipSource,
  ref: Element,
  svg: SVGSVGElement,
  root: Affine,
  resolved: Map<string, SvgClip>
): string | null {
  // root carries the root <svg> transform via getScreenCTM, so exclude it here.
  const refMatrix = clipLocalMatrix(ref, svg, false);
  const key = `${source.id}|${refMatrixFingerprint(refMatrix)}`;
  if (resolved.has(key)) {
    return key;
  }
  if (source.kind === "clip") {
    const subpaths: PathSubpath[] = [];
    let fillRule: "nonzero" | "evenodd" = "nonzero";
    for (const child of source.children) {
      const mapped = mapClipChild(
        child.subs,
        child.el,
        source.container,
        root,
        refMatrix
      );
      if (mapped.length === 0) {
        continue;
      }
      if (child.evenOdd) {
        fillRule = "evenodd";
      }
      // Each child is dominant-positive so overlapping children union under
      // NONZERO (SVG clips OR their children); relative winding inside the
      // child is preserved so holes stay holes. Harmless under evenodd.
      subpaths.push(...emitClipSubpaths(normalizeChildWinding(mapped)));
    }
    if (subpaths.length === 0) {
      return null;
    }
    resolved.set(key, { id: key, subpaths, fillRule });
    return key;
  }
  const lights: PathSubpath[] = [];
  const darks: PathSubpath[] = [];
  for (const child of source.children) {
    const mapped = mapClipChild(
      child.subs,
      child.el,
      source.container,
      root,
      refMatrix
    );
    if (mapped.length === 0) {
      continue;
    }
    if (child.dark) {
      darks.push(...mapped);
    } else {
      // Align each light child dominant-positive (union across children)
      // while preserving holes inside the child.
      lights.push(...normalizeChildWinding(mapped));
    }
  }
  if (lights.length === 0) {
    return null;
  }
  // Holes were preserved per child above; emit keeps their winding so they
  // punch reliably, then each dark contour (clipped to the lit bounds) is
  // encoded with opposite winding.
  const lit = emitClipSubpaths(lights);
  const subpaths = [...lit];
  const litBounds = subpathBounds(lit);
  if (litBounds) {
    const cuts: PathSubpath[] = [];
    for (const dark of darks) {
      if (!dark.closed || dark.points.length < 3) {
        continue;
      }
      const cut = clipSubpathToRect(dark, litBounds);
      if (!cut) {
        continue;
      }
      cuts.push(withWinding(cut, false));
    }
    subpaths.push(...emitClipSubpaths(cuts));
  }
  resolved.set(key, { id: key, subpaths, fillRule: "nonzero" });
  return key;
}

function svgFilterChild(filterEl: Element, ...names: string[]): Element | null {
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  for (const child of Array.from(filterEl.children)) {
    if (child instanceof Element && wanted.has(child.tagName.toLowerCase())) {
      return child;
    }
  }
  return null;
}

function filterElementEffects(filterEl: Element): FigmaEffect[] {
  const effects: FigmaEffect[] = [];
  const drop = svgFilterChild(filterEl, "feDropShadow");
  const blurEl = svgFilterChild(filterEl, "feGaussianBlur");
  const other = svgFilterChild(
    filterEl,
    "feOffset",
    "feComposite",
    "feBlend",
    "feColorMatrix",
    "feMerge",
    "feMorphology",
    "feConvolveMatrix",
    "feDisplacementMap",
    "feTurbulence"
  );
  if (drop && !blurEl && !other) {
    const flood: [number, number, number, number] = parseColor(
      drop.getAttribute("flood-color") ?? "rgba(0,0,0,0.5)"
    ) ?? [0, 0, 0, 0.5];
    const floodOpacity =
      parseOpacityValue(drop.getAttribute("flood-opacity")) ?? flood[3];
    effects.push(
      dropShadowEffect({
        dx: Number.parseFloat(drop.getAttribute("dx") ?? "0") || 0,
        dy: Number.parseFloat(drop.getAttribute("dy") ?? "4") || 0,
        blur: Number.parseFloat(drop.getAttribute("stdDeviation") ?? "4") || 0,
        color: [flood[0], flood[1], flood[2], floodOpacity],
      })
    );
  } else if (blurEl && filterEl.children.length === 1) {
    const std = Number.parseFloat(blurEl.getAttribute("stdDeviation") ?? "0");
    if (Number.isFinite(std) && std > 0) {
      effects.push(layerBlurEffect(std));
    }
  }
  // Anything else has no practical Figma mapping and is skipped.
  return effects;
}

function cssFilterEffects(css: string): FigmaEffect[] {
  const effects: FigmaEffect[] = [];
  const parsed = parseCssFilter(css);
  for (const shadow of parsed.dropShadows) {
    const color: [number, number, number, number] = shadow.color
      ? (parseColor(shadow.color) ?? [0, 0, 0, 0.5])
      : [0, 0, 0, 0.5];
    effects.push(
      dropShadowEffect({
        dx: shadow.dx,
        dy: shadow.dy,
        blur: shadow.blur,
        color: [color[0], color[1], color[2], color[3]],
      })
    );
  }
  if (parsed.blur !== null && parsed.blur > 0) {
    effects.push(layerBlurEffect(parsed.blur));
  }
  return effects;
}

function queryFilterElement(svg: SVGSVGElement, ref: string): Element | null {
  try {
    const id = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(ref) : ref;
    const found = svg.querySelector(`filter#${id}`);
    return found instanceof Element ? found : null;
  } catch {
    return null;
  }
}

// Ancestor opacity / blend / filter carried by one run wrapper in emitSvg.
interface ShapeAncestorGroup {
  ancestor: Element;
  effects: FigmaEffect[];
  opacity: number | undefined;
  blendMode: string | undefined;
}

// Opacity, blend mode, and filters inherit through SVG groups, but they apply
// to the composited group — not to each child. Copying ancestor opacity onto
// every vector changes overlaps (two opaque children at group opacity 0.5
// overlap at 0.75 instead of 0.5), and per-child drop shadows duplicate.
// Self properties stay on the shape; ancestor properties (nearest affecting
// ancestor defines the group, outer levels stack into it) are returned for a
// single wrapper around the run in emitSvg.
function svgShapeStyling(
  el: Element,
  style: CSSStyleDeclaration | null,
  svg: SVGSVGElement,
  getStyle: StyleGetter = safeStyle
): {
  opacity: number | undefined;
  blendMode: string | undefined;
  effects: FigmaEffect[];
  group: ShapeAncestorGroup | null;
} {
  // Walk self + ancestors: a <g filter> / <g style="filter:..."> applies to the whole group.
  const chain: Element[] = [];
  let node: Element | null = el;
  while (node && node.tagName.toLowerCase() !== "svg") {
    chain.unshift(node);
    node = node.parentElement;
  }
  // Passed style is the self element's computed style (avoids a recompute).
  const selfCss = style?.getPropertyValue("filter") || "";
  let selfOpacity: number | undefined;
  let selfBlend: string | undefined;
  const selfEffects: FigmaEffect[] = [];
  const ancestorEffects: FigmaEffect[] = [];
  let ancestorOpacityProduct = 1;
  let nearestAncestorBlend: string | undefined;
  let groupAncestor: Element | null = null;
  for (let idx = 0; idx < chain.length; idx += 1) {
    const item = chain[idx];
    if (!item) {
      continue;
    }
    const isSelf = idx === chain.length - 1;
    const cs = isSelf && style ? style : getStyle(item);
    // Opacity multiplies through ancestors; computed opacity is per-element, not inherited.
    const opacity =
      (cs ? parseOpacityValue(cs.getPropertyValue("opacity")) : undefined) ??
      parseOpacityValue(item.getAttribute("opacity"));
    let cssFilter = isSelf && selfCss ? selfCss : "";
    if (!cssFilter) {
      cssFilter = getStyle(item)?.getPropertyValue("filter") || "";
    }
    if (!cssFilter) {
      cssFilter = item.getAttribute("filter") ?? "";
      // attribute filter="url(#x)" is a ref, not CSS — handled below
      if (cssFilter.trim().startsWith("url(")) {
        cssFilter = "";
      }
    }
    const ref =
      parseClipRef(item.getAttribute("filter")) ?? parseClipRef(cssFilter);
    let refEffects: FigmaEffect[] = [];
    if (ref) {
      const filterEl = queryFilterElement(svg, ref);
      if (filterEl) {
        refEffects = filterElementEffects(filterEl);
      }
    }
    const cssEffects = cssFilter ? cssFilterEffects(cssFilter) : [];
    // Each level applies its own filter independently: identical references on
    // different elements intentionally stack, so no ref dedupe here.
    const level = [...refEffects, ...cssEffects];
    if (isSelf) {
      selfOpacity = opacity !== undefined && opacity < 1 ? opacity : undefined;
      const blend = normalizeBlendMode(
        style?.getPropertyValue("mix-blend-mode") ||
          (style as unknown as { mixBlendMode?: string } | null)
            ?.mixBlendMode ||
          ""
      );
      selfBlend = blend !== "NORMAL" ? blend : undefined;
      selfEffects.push(...level);
    } else {
      ancestorOpacityProduct *= opacity ?? 1;
      const blend = normalizeBlendMode(
        cs?.getPropertyValue("mix-blend-mode") || ""
      );
      if (blend !== "NORMAL") {
        nearestAncestorBlend = blend;
      }
      if (
        level.length > 0 ||
        (opacity !== undefined && opacity < 1) ||
        blend !== "NORMAL"
      ) {
        groupAncestor = item;
      }
      ancestorEffects.push(...level);
    }
  }
  const group: ShapeAncestorGroup | null = groupAncestor
    ? {
        ancestor: groupAncestor,
        effects: ancestorEffects,
        opacity:
          ancestorOpacityProduct < 1 ? ancestorOpacityProduct : undefined,
        blendMode: nearestAncestorBlend,
      }
    : null;
  if (group) {
    return {
      opacity: selfOpacity,
      blendMode: selfBlend,
      effects: selfEffects,
      group,
    };
  }
  // No wrapper to carry ancestors: fold them into the shape (as before).
  const full = (selfOpacity ?? 1) * ancestorOpacityProduct;
  return {
    opacity: full < 1 ? full : undefined,
    blendMode: selfBlend ?? nearestAncestorBlend,
    effects: selfEffects,
    group: null,
  };
}

// Opacity / blend / filter set on the <svg> element itself apply to the whole
// icon; per-shape helpers stop at the svg boundary, so resolve them here and
// apply to the wrapper frame in emitSvg.
function svgElementEffects(
  svg: SVGSVGElement,
  style: CSSStyleDeclaration | null
): FigmaEffect[] {
  const effects: FigmaEffect[] = [];
  const css = style?.getPropertyValue("filter") || "";
  const ref = parseClipRef(svg.getAttribute("filter")) ?? parseClipRef(css);
  if (ref) {
    const filterEl = queryFilterElement(svg, ref);
    if (filterEl) {
      effects.push(...filterElementEffects(filterEl));
    }
  }
  if (css && css.trim() !== "" && css.trim() !== "none") {
    effects.push(...cssFilterEffects(css));
  }
  return effects;
}

export function parseSvgDasharray(value: string | null): number[] | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "none") {
    return undefined;
  }

  const pattern: number[] = [];
  for (const part of trimmed.split(SVG_DASH_SEPARATOR_RE)) {
    if (!SVG_DASH_LENGTH_RE.test(part)) {
      return undefined;
    }
    const parsed = Number.parseFloat(part);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    pattern.push(parsed);
  }

  if (!pattern.some((item) => item > 0)) {
    return undefined;
  }

  return pattern.length % 2 === 0 ? pattern : [...pattern, ...pattern];
}

function svgStrokeWeight(shape: SvgShape): number | undefined {
  if (!shape.stroke) {
    return undefined;
  }
  return shape.strokeWidth > 0 ? shape.strokeWidth : 1;
}

function cleanLayerName(input: string | null | undefined): string | null {
  const cleaned = input?.replace(WHITESPACE_GLOBAL_RE, " ").trim();
  if (!cleaned) {
    return null;
  }
  if (cleaned.length <= MAX_LAYER_NAME_LENGTH) {
    return cleaned;
  }
  return `${cleaned.slice(0, MAX_LAYER_NAME_LENGTH - 3).trim()}...`;
}

function titleCase(input: string): string {
  return input
    .split(LAYER_WORD_SPLIT_RE)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function leadingCommentName(el: Element): string | null {
  let sibling = el.previousSibling;
  while (sibling) {
    if (sibling.nodeType === Node.TEXT_NODE) {
      if ((sibling.textContent ?? "").trim() === "") {
        sibling = sibling.previousSibling;
        continue;
      }
      return null;
    }
    if (sibling.nodeType === Node.COMMENT_NODE) {
      return cleanLayerName(sibling.textContent);
    }
    return null;
  }
  return null;
}

function explicitElementName(el: Element): string | null {
  return (
    cleanLayerName(el.getAttribute("data-figma-name")) ??
    cleanLayerName(el.getAttribute("data-layer-name")) ??
    cleanLayerName(el.getAttribute("aria-label")) ??
    cleanLayerName(el.getAttribute("title"))
  );
}

function compactText(input: string | null | undefined): string | null {
  return cleanLayerName(input);
}

function compactElementText(el: Element): string | null {
  const text = compactText(el.textContent);
  if (!text) {
    return null;
  }
  if (text.length > 48) {
    return null;
  }
  if (el.children.length > 1 && text.length > 24) {
    return null;
  }
  return text;
}

function numericFontWeight(fontWeight: string): number {
  if (fontWeight === "bold") {
    return 700;
  }
  if (fontWeight === "normal") {
    return 400;
  }
  const parsed = Number.parseInt(fontWeight, 10);
  return Number.isFinite(parsed) ? parsed : 400;
}

function textLayerName(
  text: string,
  fontSize: number,
  fontWeight: string,
  parentTag: string
): string {
  const label = compactText(text) ?? "Text";
  const weight = numericFontWeight(fontWeight);
  if (fontSize >= 28) {
    return `Heading - ${label}`;
  }
  if (parentTag === "p") {
    return `Paragraph - ${label}`;
  }
  if (weight >= 600 || parentTag === "button") {
    return `Label - ${label}`;
  }
  return `Text - ${label}`;
}

function elementFallbackName(
  el: Element,
  tag: string,
  style: CSSStyleDeclaration,
  rect: DOMRect,
  cornerRadii: [number, number, number, number],
  borders: BoxBorders
): string {
  const role = cleanLayerName(el.getAttribute("role"));
  if (role) {
    return titleCase(role);
  }

  const text = compactElementText(el);
  if (tag === "p") {
    return text ? `Paragraph - ${text}` : "Paragraph";
  }
  if (tag === "span") {
    if (!text && el.children.length === 0) {
      return "Spacer";
    }
    return text ? `Text Wrapper - ${text}` : "Text Wrapper";
  }
  if (tag === "button") {
    return text ? `Button - ${text}` : "Button";
  }
  if (tag === "a") {
    return text ? `Link - ${text}` : "Link";
  }
  if (tag !== "div") {
    return titleCase(tag);
  }

  const bg = parseColor(style.backgroundColor);
  const hasBackground = Boolean(bg && bg[3] > 0);
  const hasBorder = Boolean(uniformBorder(borders));
  const maxRadius = Math.max(...cornerRadii);
  const isDot =
    rect.width <= 18 &&
    rect.height <= 18 &&
    maxRadius >= Math.min(rect.width, rect.height) / 2 - 0.5;
  const isLine =
    hasBackground && rect.height <= 16 && rect.width >= rect.height * 4;

  if (text) {
    return `Group - ${text}`;
  }
  if (isDot) {
    return "Browser Dot";
  }
  if (isLine) {
    return "Content Line";
  }
  if (hasBorder && hasBackground) {
    return "Card";
  }
  if (hasBorder) {
    return "Container";
  }
  if (hasBackground && el.children.length === 0) {
    if (rect.width >= 100 && rect.height >= 100) {
      return "Background Block";
    }
    return "Shape";
  }
  if (hasBackground) {
    return "Background";
  }
  if (style.display === "flex" || style.display === "inline-flex") {
    return style.flexDirection === "row" ? "Row" : "Stack";
  }
  return "Group";
}

function elementLayerName(
  el: Element,
  tag: string,
  style: CSSStyleDeclaration,
  rect: DOMRect,
  cornerRadii: [number, number, number, number],
  borders: BoxBorders
): string {
  return (
    explicitElementName(el) ??
    leadingCommentName(el) ??
    elementFallbackName(el, tag, style, rect, cornerRadii, borders)
  );
}

const CSS_GENERIC_FONTS = new Set([
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
  "-apple-system",
  "blinkmacsystemfont",
]);

function pickAvailableFont(fontFamily: string, fontSize: number): string {
  const families = fontFamily
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);

  for (const family of families) {
    if (CSS_GENERIC_FONTS.has(family.toLowerCase())) {
      continue;
    }
    try {
      if (document.fonts.check(`${fontSize}px "${family}"`)) {
        return family;
      }
    } catch {
      // ignore
    }
  }
  return "Inter";
}

function parsePx(s: string): number {
  if (!s || s === "normal") {
    return 0;
  }
  const trimmed = s.trim();
  if (trimmed.endsWith("px")) {
    const v = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(v) ? v : 0;
  }
  const v = Number.parseFloat(trimmed);
  return Number.isFinite(v) ? v : 0;
}

function parseLineHeight(s: string, fontSize: number): number {
  if (!s || s === "normal") {
    return 0;
  }
  const trimmed = s.trim();
  if (trimmed.endsWith("px")) {
    const v = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(v) ? v : 0;
  }
  const v = Number.parseFloat(trimmed);
  if (!Number.isFinite(v)) {
    return 0;
  }
  return v < 10 ? v * fontSize : v;
}

function parseOriginComponent(value: string, size: number): number {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "center") {
    return size / 2;
  }
  if (normalized === "left" || normalized === "top") {
    return 0;
  }
  if (normalized === "right" || normalized === "bottom") {
    return size;
  }
  if (normalized.endsWith("%")) {
    const percent = Number.parseFloat(normalized.slice(0, -1));
    return Number.isFinite(percent) ? (percent / 100) * size : size / 2;
  }
  const px = normalized.endsWith("px")
    ? Number.parseFloat(normalized.slice(0, -2))
    : Number.parseFloat(normalized);
  return Number.isFinite(px) ? px : size / 2;
}

function splitTransformOrigin(value: string): [string, string] {
  const parts = value.trim().split(WHITESPACE_RE).filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  if (!first) {
    return ["center", "center"];
  }
  if (!second) {
    return first === "top" || first === "bottom"
      ? ["center", first]
      : [first, "center"];
  }
  return [first, second];
}

function authoredTransformOrigin(el: Element): string {
  if (!("style" in el)) {
    return "";
  }
  const style = (el as HTMLElement | SVGElement).style;
  return style.transformOrigin;
}

function elementTransform(
  el: Element,
  style: CSSStyleDeclaration,
  rect: DOMRect
): Transform {
  if (!style.transform || style.transform === "none") {
    return transformAt(rect.left, rect.top);
  }

  const matrix = new DOMMatrixReadOnly(style.transform);
  if (!matrix.is2D) {
    return transformAt(rect.left, rect.top);
  }

  const [originXValue, originYValue] = splitTransformOrigin(
    authoredTransformOrigin(el) || "center"
  );
  const originX = parseOriginComponent(originXValue, rect.width);
  const originY = parseOriginComponent(originYValue, rect.height);

  return {
    m00: matrix.a,
    m01: matrix.c,
    m02:
      rect.left + originX + matrix.e - matrix.a * originX - matrix.c * originY,
    m10: matrix.b,
    m11: matrix.d,
    m12:
      rect.top + originY + matrix.f - matrix.b * originX - matrix.d * originY,
  };
}

function relativeTransform(
  transform: Transform,
  parentX: number,
  parentY: number
): Transform {
  return {
    ...transform,
    m02: transform.m02 - parentX,
    m12: transform.m12 - parentY,
  };
}

function parseCornerRadius(s: string): number {
  if (!s) {
    return 0;
  }
  const first = s.trim().split(WHITESPACE_RE)[0];
  return first ? parsePx(first) : 0;
}

function borderSide(width: string, color: string, style: string): BorderSide {
  const parsedWidth = parsePx(width);
  return {
    color: parsedWidth > 0 && style !== "none" ? color : "",
    width: parsedWidth > 0 && style !== "none" ? parsedWidth : 0,
  };
}

function sameBorderSide(a: BorderSide, b: BorderSide): boolean {
  return a.width === b.width && a.color === b.color;
}

function uniformBorder(borders: BoxBorders): BorderSide | null {
  const { top, right, bottom, left } = borders;
  if (top.width <= 0 || !top.color) {
    return null;
  }
  if (
    sameBorderSide(top, right) &&
    sameBorderSide(top, bottom) &&
    sameBorderSide(top, left)
  ) {
    return top;
  }
  return null;
}

function extractLayout(node: Node): LayoutNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.nodeValue ?? "")
      .replace(WHITESPACE_GLOBAL_RE, " ")
      .trim();
    if (!text) {
      return null;
    }
    const parent = node.parentElement;
    if (!parent) {
      return null;
    }
    const range = document.createRange();
    range.selectNodeContents(node);
    const rect = range.getBoundingClientRect();
    const lineRects = range.getClientRects();
    range.detach?.();
    const parentRect = parent.getBoundingClientRect();
    const style = getComputedStyle(parent);
    return {
      kind: "text",
      name: textLayerName(
        text,
        Number.parseFloat(style.fontSize),
        style.fontWeight,
        parent.tagName.toLowerCase()
      ),
      text,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      fontFamily: style.fontFamily,
      fontSize: Number.parseFloat(style.fontSize),
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      color: style.color,
      textAlign: style.textAlign,
      wrapped: lineRects.length > 1,
      parentX: parentRect.left,
      parentY: parentRect.top,
      parentWidth: parentRect.width,
      parentHeight: parentRect.height,
    };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }
  if (!(node instanceof Element)) {
    return null;
  }
  const el = node;
  const tag = el.tagName.toLowerCase();
  if (IGNORED_TAGS.has(tag)) {
    return null;
  }

  if (tag === "svg") {
    if (!(el instanceof SVGSVGElement)) {
      return null;
    }
    const svg = el;
    const rect = svg.getBoundingClientRect();
    // One computed-style lookup per element per svg pass; shared by the
    // clip/opacity/blend/filter helpers below.
    const styleCache = new Map<Element, CSSStyleDeclaration | null>();
    const getStyle: StyleGetter = (target) => {
      if (styleCache.has(target)) {
        return styleCache.get(target) ?? null;
      }
      const cs = safeStyle(target);
      styleCache.set(target, cs);
      return cs;
    };
    const style = getStyle(svg);
    const svgFill = svg.getAttribute("fill");
    const svgStroke = svg.getAttribute("stroke");
    const fallbackColor = style?.color ?? "currentColor";

    const shapes: SvgShape[] = [];
    const restoreUses = inlineSvgUses(svg);
    const clipSources = collectSvgClipSources(svg, getStyle);
    const clipRoot = svgRootScreenAffine(svg);
    const resolvedClips = new Map<string, SvgClip>();
    const effectGroupIds = new Map<Element, string>();
    const effectGroups: SvgEffectGroup[] = [];
    const geomEls = svg.querySelectorAll(SVG_GEOMETRY_SELECTOR);
    for (const geomEl of geomEls) {
      if (!(geomEl instanceof SVGGraphicsElement)) {
        continue;
      }
      if (geomEl.closest("defs, symbol, clipPath, mask, filter")) {
        continue;
      }
      const ctm = geomEl.getScreenCTM();
      if (!ctm) {
        continue;
      }
      const subpaths = svgPrimitiveToSubpaths(
        geomEl.tagName.toLowerCase(),
        svgGeometryAttrs(geomEl)
      );
      if (subpaths.length === 0) {
        continue;
      }
      const geomStyle = getStyle(geomEl);
      const geomFill = geomEl.getAttribute("fill");
      const geomStroke = geomEl.getAttribute("stroke");
      const stroke = svgPaintValue(
        geomStroke,
        svgStroke ?? geomStyle?.stroke ?? null,
        fallbackColor
      );
      const strokeDasharray =
        parseSvgDasharray(geomEl.getAttribute("stroke-dasharray")) ??
        parseSvgDasharray(svg.getAttribute("stroke-dasharray")) ??
        parseSvgDasharray(
          geomStyle?.getPropertyValue("stroke-dasharray") ?? null
        );
      const fill = svgPaintValue(
        geomFill,
        svgFill ??
          (stroke || geomStroke || svgStroke
            ? null
            : (geomStyle?.fill ?? null)),
        fallbackColor
      );
      if (!fill && !stroke) {
        continue;
      }
      const fillRule: "nonzero" | "evenodd" =
        geomEl.getAttribute("fill-rule") === "evenodd" ||
        geomEl.getAttribute("clip-rule") === "evenodd" ||
        geomStyle?.getPropertyValue("fill-rule").trim() === "evenodd" ||
        geomStyle?.getPropertyValue("clip-rule").trim() === "evenodd"
          ? "evenodd"
          : "nonzero";
      const transformed: PathSubpath[] = subpaths.map((sub) => ({
        closed: sub.closed,
        points: sub.points.map((p) => ({
          x: ctm.a * p.x + ctm.c * p.y + ctm.e,
          y: ctm.b * p.x + ctm.d * p.y + ctm.f,
        })),
      }));
      const strokeScale = Math.hypot(ctm.a, ctm.b) || 1;
      // objectBoundingBox clips/masks have no source, so the resolve below
      // intentionally drops those refs (no userSpaceOnUse mapping).
      const clipRefs = svgClipRefs(geomEl, geomStyle, getStyle);
      const clipChain: string[] = [];
      for (const { id, ref } of clipRefs) {
        const source = clipSources.get(id);
        if (!source) {
          continue;
        }
        const key = resolveClipKey(source, ref, svg, clipRoot, resolvedClips);
        if (key) {
          clipChain.push(key);
        }
      }
      const styling = svgShapeStyling(geomEl, geomStyle, svg, getStyle);
      const group = styling.group;
      let effectGroup: string | null = null;
      let filterOutside = false;
      if (group) {
        let gid = effectGroupIds.get(group.ancestor);
        if (!gid) {
          gid = `effect-group-${effectGroupIds.size + 1}`;
          effectGroupIds.set(group.ancestor, gid);
          effectGroups.push({
            id: gid,
            effects: group.effects,
            opacity: group.opacity,
            blendMode: group.blendMode,
          });
        }
        effectGroup = gid;
        // A filter on the same element (or inside the clip refs) applies
        // before clipping, so its wrapper sits inside the clip containers;
        // an outer filter applies after. Opacity commutes with clipping, so
        // the opacity/blend wrapper always sits outside.
        filterOutside = clipRefs.every(({ ref }) =>
          group.ancestor.contains(ref)
        );
      }
      shapes.push({
        subpaths: transformed,
        fill,
        fillRule,
        stroke,
        strokeLineCap:
          geomEl.getAttribute("stroke-linecap") ??
          svg.getAttribute("stroke-linecap") ??
          geomStyle?.strokeLinecap ??
          "butt",
        strokeLineJoin:
          geomEl.getAttribute("stroke-linejoin") ??
          svg.getAttribute("stroke-linejoin") ??
          geomStyle?.strokeLinejoin ??
          "miter",
        strokeDasharray:
          strokeDasharray?.map((dash) => dash * strokeScale) ?? null,
        strokeWidth:
          parsePx(
            geomEl.getAttribute("stroke-width") ??
              svg.getAttribute("stroke-width") ??
              geomStyle?.strokeWidth ??
              ""
          ) * strokeScale,
        clipChain,
        effectGroup,
        filterOutside,
        opacity: styling.opacity,
        blendMode: styling.blendMode,
        effects: styling.effects,
      });
    }
    restoreUses();

    const svgOpacity = (() => {
      let opacity: number | undefined = parseOpacityValue(
        style?.getPropertyValue("opacity")
      );
      opacity ??= parseOpacityValue(svg.getAttribute("opacity"));
      return opacity !== undefined && opacity < 1 ? opacity : undefined;
    })();
    const svgBlendMode = (() => {
      const normalized = normalizeBlendMode(
        style?.getPropertyValue("mix-blend-mode") || ""
      );
      return normalized !== "NORMAL" ? normalized : undefined;
    })();

    return {
      kind: "svg",
      name: explicitElementName(svg) ?? leadingCommentName(svg) ?? "Icon",
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      transform: transformAt(rect.left, rect.top),
      background: style?.backgroundColor ?? "rgba(0, 0, 0, 0)",
      color: fallbackColor,
      shapes,
      clips: [...resolvedClips.values()],
      effectGroups,
      clipsContent:
        (style?.getPropertyValue("overflow") || "").trim() !== "visible",
      opacity: svgOpacity,
      blendMode: svgBlendMode,
      effects: svgElementEffects(svg, style),
    };
  }

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return null;
  }
  const style = getComputedStyle(el);

  const children: LayoutNode[] = [];
  for (const child of Array.from(el.childNodes)) {
    const c = extractLayout(child);
    if (c) {
      children.push(c);
    }
  }

  const cornerRadii: [number, number, number, number] = [
    parseCornerRadius(style.borderTopLeftRadius),
    parseCornerRadius(style.borderTopRightRadius),
    parseCornerRadius(style.borderBottomRightRadius),
    parseCornerRadius(style.borderBottomLeftRadius),
  ];

  const borders: BoxBorders = {
    top: borderSide(
      style.borderTopWidth,
      style.borderTopColor,
      style.borderTopStyle
    ),
    right: borderSide(
      style.borderRightWidth,
      style.borderRightColor,
      style.borderRightStyle
    ),
    bottom: borderSide(
      style.borderBottomWidth,
      style.borderBottomColor,
      style.borderBottomStyle
    ),
    left: borderSide(
      style.borderLeftWidth,
      style.borderLeftColor,
      style.borderLeftStyle
    ),
  };

  return {
    kind: "element",
    name: elementLayerName(el, tag, style, rect, cornerRadii, borders),
    tag,
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    transform: elementTransform(el, style, rect),
    background: style.backgroundColor,
    cornerRadii,
    borders,
    children,
  };
}

function emitSvg(
  sb: SceneBuilder,
  svgNode: SvgInfo,
  parent: Guid,
  parentX: number,
  parentY: number
): void {
  const bg = parseColor(svgNode.background);
  const fill = bg && bg[3] > 0 ? solidFill(bg[0], bg[1], bg[2], bg[3]) : null;
  const frameGuid = sb.addFrame({
    parent,
    name: svgNode.name,
    x: svgNode.x - parentX,
    y: svgNode.y - parentY,
    width: svgNode.width,
    height: svgNode.height,
    fill,
    clipsContent: svgNode.clipsContent,
    opacity: svgNode.opacity,
    blendMode: svgNode.blendMode,
    effects: svgNode.effects.length > 0 ? svgNode.effects : undefined,
  });

  const clips = new Map<string, SvgClip>(svgNode.clips.map((c) => [c.id, c]));
  const effectGroupProps = new Map<string, SvgEffectGroup>(
    svgNode.effectGroups.map((g) => [g.id, g])
  );
  // Emit in document order: consecutive shapes sharing a clip chain AND effect
  // group share one clip container (+ group wrappers), but a repeated key
  // later gets fresh containers so paint order is preserved (grouping by key
  // would reorder overlapping shapes).
  const runKey = (shape: SvgShape): string =>
    `${shape.clipChain.filter((id) => clips.has(id)).join("|")}\n${shape.effectGroup ?? ""}`;
  const chainOf = (shape: SvgShape): string[] =>
    shape.clipChain.filter((id) => clips.has(id));
  const groupOf = (shape: SvgShape): SvgEffectGroup | null => {
    if (!shape.effectGroup) {
      return null;
    }
    const group = effectGroupProps.get(shape.effectGroup);
    if (
      !group ||
      (group.effects.length === 0 &&
        group.opacity === undefined &&
        group.blendMode === undefined)
    ) {
      return null;
    }
    return group;
  };

  const buildContainer = (
    chain: string[],
    parent: Guid,
    originX: number,
    originY: number
  ): {
    guid: Guid;
    x: number;
    y: number;
    w: number;
    h: number;
  } => {
    let container = parent;
    let x = originX;
    let y = originY;
    let w = svgNode.width;
    let h = svgNode.height;
    for (const clipId of chain) {
      const clip = clips.get(clipId);
      if (!clip) {
        continue;
      }
      const bounds = subpathBounds(clip.subpaths);
      if (!bounds) {
        continue;
      }
      const width = Math.max(1, bounds.maxX - bounds.minX);
      const height = Math.max(1, bounds.maxY - bounds.minY);
      const rect = rectClipBounds(clip.subpaths);
      if (rect) {
        container = sb.addFrame({
          parent: container,
          name: `${svgNode.name} Clip`,
          x: rect.minX - x,
          y: rect.minY - y,
          width: Math.max(1, rect.maxX - rect.minX),
          height: Math.max(1, rect.maxY - rect.minY),
          clipsContent: true,
        });
        x = rect.minX;
        y = rect.minY;
        w = Math.max(1, rect.maxX - rect.minX);
        h = Math.max(1, rect.maxY - rect.minY);
      } else {
        const maskFrame = sb.addFrame({
          parent: container,
          name: `${svgNode.name} Clip`,
          x: bounds.minX - x,
          y: bounds.minY - y,
          width,
          height,
        });
        // Figma masks sit BELOW the content they clip, so the mask vector
        // is emitted first, before the shapes.
        emitSvgSubpaths(
          sb,
          {
            subpaths: [],
            fill: "#ffffff",
            fillRule: clip.fillRule,
            stroke: null,
            strokeLineCap: "butt",
            strokeLineJoin: "miter",
            strokeDasharray: null,
            strokeWidth: 0,
            clipChain: [],
            effectGroup: null,
            filterOutside: false,
            opacity: undefined,
            blendMode: undefined,
            effects: [],
          },
          clip.subpaths,
          maskFrame,
          bounds.minX,
          bounds.minY,
          `${svgNode.name} Mask`,
          { mask: true, maskType: "ALPHA" }
        );
        container = maskFrame;
        x = bounds.minX;
        y = bounds.minY;
        w = width;
        h = height;
      }
    }
    return { guid: container, x, y, w, h };
  };

  // Contiguous runs share a container (+ filter wrapper); each run gets fresh
  // ones so document paint order is preserved across interleaved keys.
  let shapeIndex = 0;
  let i = 0;
  while (i < svgNode.shapes.length) {
    const first = svgNode.shapes[i];
    if (!first) {
      i += 1;
      continue;
    }
    const key = runKey(first);
    let j = i + 1;
    while (j < svgNode.shapes.length) {
      const next = svgNode.shapes[j];
      if (!next || runKey(next) !== key) {
        break;
      }
      j += 1;
    }
    const group = groupOf(first);
    const chain = chainOf(first);
    let container: Guid;
    let originX: number;
    let originY: number;
    if (group && chain.length === 0) {
      // No clip containers: one wrapper carries filter, opacity, and blend.
      container = sb.addFrame({
        parent: frameGuid,
        name: `${svgNode.name} Group`,
        x: 0,
        y: 0,
        width: svgNode.width,
        height: svgNode.height,
        effects: group.effects.length > 0 ? group.effects : undefined,
        opacity: group.opacity,
        blendMode: group.blendMode,
      });
      originX = svgNode.x;
      originY = svgNode.y;
    } else {
      // An outer filter wraps the clip containers; a same-element (or inner)
      // filter wraps the shapes inside them — mirroring SVG filter/clip
      // order. The opacity/blend wrapper always sits outside: opacity
      // commutes with clipping, and blending applies to clipped content.
      const outerEffects = group && first.filterOutside ? group.effects : [];
      let runParent = frameGuid;
      if (
        group &&
        (outerEffects.length > 0 ||
          group.opacity !== undefined ||
          group.blendMode !== undefined)
      ) {
        runParent = sb.addFrame({
          parent: frameGuid,
          name: `${svgNode.name} Group`,
          x: 0,
          y: 0,
          width: svgNode.width,
          height: svgNode.height,
          effects: outerEffects.length > 0 ? outerEffects : undefined,
          opacity: group.opacity,
          blendMode: group.blendMode,
        });
      }
      const built = buildContainer(chain, runParent, svgNode.x, svgNode.y);
      container = built.guid;
      originX = built.x;
      originY = built.y;
      const innerEffects = group && !first.filterOutside ? group.effects : [];
      if (innerEffects.length > 0) {
        container = sb.addFrame({
          parent: container,
          name: `${svgNode.name} Filter`,
          x: 0,
          y: 0,
          width: built.w,
          height: built.h,
          effects: innerEffects,
        });
      }
    }
    for (let k = i; k < j; k += 1) {
      const shape = svgNode.shapes[k];
      if (!shape) {
        continue;
      }
      shapeIndex += 1;
      const suffix = svgNode.shapes.length > 1 ? ` ${shapeIndex}` : "";
      emitSvgSubpaths(
        sb,
        shape,
        shape.subpaths,
        container,
        originX,
        originY,
        `${svgNode.name} Shape${suffix}`
      );
    }
    i = j;
  }
}

function emitSvgSubpaths(
  sb: SceneBuilder,
  shape: SvgShape,
  subpaths: PathSubpath[],
  parent: Guid,
  parentX: number,
  parentY: number,
  name: string,
  maskOverride?: { mask: boolean; maskType: string }
): void {
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
    return;
  }
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  const vertices: Array<{ x: number; y: number }> = [];
  const segments: Array<{ vStart: number; vEnd: number }> = [];
  const loops: Array<{ segmentIndices: number[] }> = [];
  const hasFill = Boolean(shape.fill);

  for (const sub of subpaths) {
    const startIdx = vertices.length;
    const pts = sub.points;
    let count = pts.length;
    let closesPath = sub.closed || hasFill;
    if (count >= 2) {
      const first = pts[0];
      const last = pts[count - 1];
      if (
        first &&
        last &&
        Math.hypot(first.x - last.x, first.y - last.y) < 0.0001
      ) {
        count -= 1;
        closesPath = true;
      }
    }
    for (let i = 0; i < count; i += 1) {
      const p = pts[i];
      if (!p) {
        continue;
      }
      vertices.push({ x: p.x - minX, y: p.y - minY });
    }
    const numVerts = vertices.length - startIdx;
    if (numVerts < 2) {
      continue;
    }
    const segStart = segments.length;
    const lastIdx = numVerts - 1;
    for (let i = 0; i < lastIdx; i += 1) {
      segments.push({ vStart: startIdx + i, vEnd: startIdx + i + 1 });
    }
    if (closesPath && numVerts >= 3) {
      segments.push({ vStart: startIdx + lastIdx, vEnd: startIdx });
      const loopSegs: number[] = [];
      for (let i = segStart; i < segments.length; i += 1) {
        loopSegs.push(i);
      }
      loops.push({ segmentIndices: loopSegs });
    }
  }

  if (vertices.length < 2 || segments.length === 0) {
    return;
  }

  const shapeColor = shape.fill ? parseColor(shape.fill) : null;
  const fill =
    shapeColor && shapeColor[3] > 0 && loops.length > 0
      ? solidFill(shapeColor[0], shapeColor[1], shapeColor[2], shapeColor[3])
      : null;
  const strokeColor = shape.stroke ? parseColor(shape.stroke) : null;
  const stroke =
    strokeColor && strokeColor[3] > 0
      ? solidFill(
          strokeColor[0],
          strokeColor[1],
          strokeColor[2],
          strokeColor[3]
        )
      : null;

  if (!fill && !stroke) {
    return;
  }

  sb.addVector({
    parent,
    name,
    x: minX - parentX,
    y: minY - parentY,
    width,
    height,
    fill,
    stroke,
    strokeCap: svgStrokeCap(shape.strokeLineCap),
    dashPattern: shape.strokeDasharray ?? undefined,
    strokeJoin: svgStrokeJoin(shape.strokeLineJoin),
    strokeWeight: svgStrokeWeight(shape),
    opacity: shape.opacity,
    blendMode: shape.blendMode,
    effects: shape.effects.length > 0 ? shape.effects : undefined,
    mask: maskOverride?.mask ? true : undefined,
    maskType: maskOverride?.maskType,
    network: {
      vertices,
      segments,
      regions:
        fill && loops.length > 0
          ? [
              {
                loops,
                windingRule: shape.fillRule === "evenodd" ? "ODD" : "NONZERO",
              },
            ]
          : [],
    },
  });
}

function emitPartialBorders(
  sb: SceneBuilder,
  borders: BoxBorders,
  parent: Guid,
  width: number,
  height: number
): void {
  const sides: Array<{
    border: BorderSide;
    height: number;
    name: string;
    width: number;
    x: number;
    y: number;
  }> = [
    {
      border: borders.top,
      height: borders.top.width,
      name: "border-top",
      width,
      x: 0,
      y: 0,
    },
    {
      border: borders.right,
      height,
      name: "border-right",
      width: borders.right.width,
      x: width - borders.right.width,
      y: 0,
    },
    {
      border: borders.bottom,
      height: borders.bottom.width,
      name: "border-bottom",
      width,
      x: 0,
      y: height - borders.bottom.width,
    },
    {
      border: borders.left,
      height,
      name: "border-left",
      width: borders.left.width,
      x: 0,
      y: 0,
    },
  ];

  for (const side of sides) {
    if (side.border.width <= 0) {
      continue;
    }
    const color = parseColor(side.border.color);
    if (!color || color[3] <= 0) {
      continue;
    }
    sb.addFrame({
      parent,
      name: side.name,
      x: side.x,
      y: side.y,
      width: side.width,
      height: side.height,
      fill: solidFill(color[0], color[1], color[2], color[3]),
    });
  }
}

function emitElement(
  sb: SceneBuilder,
  textLayout: TextLayoutCache | null,
  textFont: Font | null,
  node: ElementInfo,
  parent: Guid,
  parentX: number,
  parentY: number
): void {
  const relX = node.x - parentX;
  const relY = node.y - parentY;
  const bg = parseColor(node.background);
  const fill = bg && bg[3] > 0 ? solidFill(bg[0], bg[1], bg[2], bg[3]) : null;
  const uniformStroke = uniformBorder(node.borders);
  const borderRgba = uniformStroke ? parseColor(uniformStroke.color) : null;
  const stroke =
    borderRgba && borderRgba[3] > 0 && uniformStroke
      ? solidFill(borderRgba[0], borderRgba[1], borderRgba[2], borderRgba[3])
      : null;

  const frameGuid = sb.addFrame({
    parent,
    name: node.name,
    x: relX,
    y: relY,
    transform: relativeTransform(node.transform, parentX, parentY),
    width: node.width,
    height: node.height,
    fill,
    cornerRadii: node.cornerRadii,
    stroke,
    strokeWeight: uniformStroke?.width,
  });

  for (const child of node.children) {
    if (child.kind === "text") {
      const color = parseColor(child.color) ?? [0, 0, 0, 1];
      const fontFamily = pickAvailableFont(child.fontFamily, child.fontSize);
      const weightStyle =
        WEIGHT_TO_STYLE[String(child.fontWeight)] ?? "Regular";
      const fontWeight = Number.parseInt(child.fontWeight, 10);
      const lineHeight = parseLineHeight(child.lineHeight, child.fontSize);
      const letterSpacing = parsePx(child.letterSpacing);
      const align = TEXT_ALIGN_MAP[child.textAlign] ?? "LEFT";

      const effectiveLineHeight =
        lineHeight > 0 ? lineHeight : child.fontSize * 1.2;
      const singleLineBoxHeight = Math.max(
        child.height,
        effectiveLineHeight,
        child.fontSize
      );
      let textX = child.wrapped ? child.parentX - node.x : child.x - node.x;
      const rawTextY = child.wrapped
        ? child.parentY - node.y
        : child.y - node.y;
      const parentYLocal = child.parentY - node.y;
      const centeredTextY =
        parentYLocal +
        Math.max(0, child.parentHeight - singleLineBoxHeight) / 2;
      const textY = child.wrapped
        ? parentYLocal
        : Math.min(Math.max(rawTextY, parentYLocal), centeredTextY);
      let textWidth = child.wrapped ? child.parentWidth : child.width;
      const textHeight = child.wrapped ? child.height : singleLineBoxHeight;
      const autoResize = child.wrapped ? "HEIGHT" : "NONE";
      const layoutDerivedText = (maxWidth: number) =>
        textLayout && textFont
          ? textLayout.layout({
              text: child.text,
              fontFamily,
              fontStyle: weightStyle,
              fontWeight: Number.isFinite(fontWeight) ? fontWeight : 400,
              fontSize: child.fontSize,
              lineHeight,
              letterSpacing,
              maxWidth,
              wrap: child.wrapped,
              alignHorizontal: align,
              font: textFont,
            })
          : null;
      let derivedTextData = layoutDerivedText(textWidth);
      const derivedWidth = derivedTextData?.layoutSize.x ?? 0;
      const shouldAnchorTextBox =
        !child.wrapped &&
        derivedWidth > textWidth &&
        (align === "CENTER" || align === "RIGHT");

      if (shouldAnchorTextBox) {
        const delta = derivedWidth - textWidth;
        textX -= align === "CENTER" ? delta / 2 : delta;
        textWidth = derivedWidth;
        derivedTextData = layoutDerivedText(textWidth);
      }

      sb.addText({
        parent: frameGuid,
        name: child.name,
        text: child.text,
        x: textX,
        y: textY,
        width: textWidth,
        height: textHeight,
        fontFamily,
        fontStyle: weightStyle,
        fontSize: child.fontSize,
        lineHeight,
        letterSpacing,
        color,
        alignHorizontal: align,
        autoResize,
        derivedTextData: derivedTextData ?? undefined,
      });
    } else if (child.kind === "svg") {
      emitSvg(sb, child, frameGuid, node.x, node.y);
    } else {
      emitElement(sb, textLayout, textFont, child, frameGuid, node.x, node.y);
    }
  }

  if (!uniformStroke) {
    emitPartialBorders(sb, node.borders, frameGuid, node.width, node.height);
  }
}

export async function buildSceneFromElement(
  element: HTMLElement,
  options: BuildSceneFromElementOptions = {}
): Promise<SceneBuilder> {
  const layout = extractLayout(element);
  if (!layout || layout.kind !== "element") {
    throw new Error("Element produced no extractable layout");
  }

  let root: ElementInfo = layout;
  const nonTextChildren = root.children.filter((c) => c.kind !== "text");
  const onlyChild = nonTextChildren[0];
  if (nonTextChildren.length === 1 && onlyChild?.kind === "element") {
    root = onlyChild;
  }

  const sb = new SceneBuilder();
  const textFont = await loadTextFont();
  const textLayout = textFont ? new TextLayoutCache(sb) : null;
  const requestedName = cleanLayerName(options.name);
  if (requestedName) {
    root = { ...root, name: requestedName };
  }
  emitElement(sb, textLayout, textFont, root, sb.canvasGuid, root.x, root.y);
  return sb;
}
