import type { Transform } from "../types/scene";
import type { SvgPrimitiveAttrs } from "../types/svg-primitive";
import type {
  ResolvedUseShape,
  SvgPreserveAspectRatio,
  SvgUseViewport,
  SvgViewBox,
} from "../types/svg-use";
import { svgPrimitiveToSubpaths } from "./svg-primitive";

const GEOMETRY_TAGS = new Set([
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
]);

const DEFINITION_TAGS = new Set(["defs", "symbol"]);

const MAX_USE_DEPTH = 8;

const URL_REF_RE = /^url\(\s*["']?#([^"')]+)["']?\s*\)$/i;
const TRANSFORM_FN_RE = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
const TRANSFORM_NUM_RE = /-?\d*\.?\d+(?:[eE][+-]?\d+)?/g;
const PRESERVE_ALIGN_RE = /^(xMin|xMid|xMax)(YMin|YMid|YMax)$/i;
const WHITESPACE_RE = /\s+/;

function identityTransform(): Transform {
  return { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
}

export function multiplyTransforms(a: Transform, b: Transform): Transform {
  return {
    m00: a.m00 * b.m00 + a.m01 * b.m10,
    m01: a.m00 * b.m01 + a.m01 * b.m11,
    m02: a.m00 * b.m02 + a.m01 * b.m12 + a.m02,
    m10: a.m10 * b.m00 + a.m11 * b.m10,
    m11: a.m10 * b.m01 + a.m11 * b.m11,
    m12: a.m10 * b.m02 + a.m11 * b.m12 + a.m12,
  };
}

export function translateTransform(x: number, y: number): Transform {
  return { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y };
}

/**
 * Parse a `href`/`xlink:href` value. Only local fragment references (`#id`)
 * are supported; external URLs resolve to null so callers skip them silently.
 */
export function parseUseHref(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const urlMatch = URL_REF_RE.exec(trimmed);
  const fragment =
    urlMatch?.[1] ?? (trimmed.startsWith("#") ? trimmed.slice(1) : null);
  if (fragment == null) {
    return null;
  }
  let id: string;
  try {
    id = decodeURIComponent(fragment);
  } catch {
    id = fragment;
  }
  id = id.trim();
  if (!id || /[\s"'<>]/.test(id)) {
    return null;
  }
  return id;
}

function transformNumbers(args: string): number[] {
  const out: number[] = [];
  TRANSFORM_NUM_RE.lastIndex = 0;
  let m: RegExpExecArray | null = TRANSFORM_NUM_RE.exec(args);
  while (m) {
    out.push(Number.parseFloat(m[0]));
    m = TRANSFORM_NUM_RE.exec(args);
  }
  TRANSFORM_NUM_RE.lastIndex = 0;
  return out;
}

/** Parse an SVG `transform` attribute into a 2D matrix. Unknown functions are ignored. */
export function parseSvgTransformAttr(
  value: string | null | undefined
): Transform {
  if (!value) {
    return identityTransform();
  }
  let result = identityTransform();
  TRANSFORM_FN_RE.lastIndex = 0;
  let m: RegExpExecArray | null = TRANSFORM_FN_RE.exec(value);
  while (m) {
    const name = m[1]?.toLowerCase();
    const nums = transformNumbers(m[2] ?? "");
    let next: Transform | null = null;
    switch (name) {
      case "matrix": {
        if (nums.length >= 6) {
          next = {
            m00: nums[0] ?? 1,
            m01: nums[2] ?? 0,
            m02: nums[4] ?? 0,
            m10: nums[1] ?? 0,
            m11: nums[3] ?? 1,
            m12: nums[5] ?? 0,
          };
        }
        break;
      }
      case "translate": {
        const tx = nums[0] ?? 0;
        const ty = nums.length > 1 ? (nums[1] ?? 0) : 0;
        next = translateTransform(tx, ty);
        break;
      }
      case "scale": {
        const sx = nums[0] ?? 1;
        const sy = nums.length > 1 ? (nums[1] ?? sx) : sx;
        next = { m00: sx, m01: 0, m02: 0, m10: 0, m11: sy, m12: 0 };
        break;
      }
      case "rotate": {
        const radians = ((nums[0] ?? 0) * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const rotation: Transform = {
          m00: cos,
          m01: -sin,
          m02: 0,
          m10: sin,
          m11: cos,
          m12: 0,
        };
        if (nums.length > 2) {
          const cx = nums[1] ?? 0;
          const cy = nums[2] ?? 0;
          next = multiplyTransforms(
            translateTransform(cx, cy),
            multiplyTransforms(rotation, translateTransform(-cx, -cy))
          );
        } else {
          next = rotation;
        }
        break;
      }
      case "skewx": {
        const t = Math.tan(((nums[0] ?? 0) * Math.PI) / 180);
        next = { m00: 1, m01: t, m02: 0, m10: 0, m11: 1, m12: 0 };
        break;
      }
      case "skewy": {
        const t = Math.tan(((nums[0] ?? 0) * Math.PI) / 180);
        next = { m00: 1, m01: 0, m02: 0, m10: t, m11: 1, m12: 0 };
        break;
      }
      default: {
        break;
      }
    }
    if (next) {
      result = multiplyTransforms(result, next);
    }
    m = TRANSFORM_FN_RE.exec(value);
  }
  TRANSFORM_FN_RE.lastIndex = 0;
  return result;
}

export function parseSvgViewBox(
  value: string | null | undefined
): SvgViewBox | null {
  if (!value) {
    return null;
  }
  const nums = transformNumbers(value);
  if (nums.length < 4) {
    return null;
  }
  const minX = nums[0] ?? 0;
  const minY = nums[1] ?? 0;
  const width = nums[2] ?? 0;
  const height = nums[3] ?? 0;
  if (
    ![minX, minY, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return { minX, minY, width, height };
}

export function parsePreserveAspectRatio(
  value: string | null | undefined
): SvgPreserveAspectRatio {
  const fallback: SvgPreserveAspectRatio = {
    xAlign: 0.5,
    yAlign: 0.5,
    mode: "meet",
  };
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }
  const parts = trimmed.split(WHITESPACE_RE).filter(Boolean);
  const align = parts[0] ?? "";
  if (align.toLowerCase() === "none") {
    return { xAlign: 0.5, yAlign: 0.5, mode: "none" };
  }
  const match = PRESERVE_ALIGN_RE.exec(align);
  if (!match) {
    return fallback;
  }
  const xPart = (match[1] ?? "").toLowerCase();
  const yPart = (match[2] ?? "").toLowerCase();
  let xAlign = 0.5;
  if (xPart === "xmin") {
    xAlign = 0;
  } else if (xPart === "xmax") {
    xAlign = 1;
  }
  let yAlign = 0.5;
  if (yPart === "ymin") {
    yAlign = 0;
  } else if (yPart === "ymax") {
    yAlign = 1;
  }
  return {
    xAlign,
    yAlign,
    mode: (parts[1] ?? "").toLowerCase() === "slice" ? "slice" : "meet",
  };
}

/** Map a viewBox onto a viewport, honoring preserveAspectRatio. */
export function computeViewBoxTransform(
  viewBox: SvgViewBox,
  viewport: SvgUseViewport,
  aspect: SvgPreserveAspectRatio
): Transform {
  if (viewport.width <= 0 || viewport.height <= 0) {
    return identityTransform();
  }
  if (aspect.mode === "none") {
    const scaleX = viewport.width / viewBox.width;
    const scaleY = viewport.height / viewBox.height;
    return {
      m00: scaleX,
      m01: 0,
      m02: viewport.x - viewBox.minX * scaleX,
      m10: 0,
      m11: scaleY,
      m12: viewport.y - viewBox.minY * scaleY,
    };
  }
  const fit =
    aspect.mode === "slice"
      ? Math.max(
          viewport.width / viewBox.width,
          viewport.height / viewBox.height
        )
      : Math.min(
          viewport.width / viewBox.width,
          viewport.height / viewBox.height
        );
  const extraX = viewport.width - viewBox.width * fit;
  const extraY = viewport.height - viewBox.height * fit;
  return {
    m00: fit,
    m01: 0,
    m02: viewport.x - viewBox.minX * fit + extraX * aspect.xAlign,
    m10: 0,
    m11: fit,
    m12: viewport.y - viewBox.minY * fit + extraY * aspect.yAlign,
  };
}

function tagOf(el: Element): string {
  return el.tagName.toLowerCase();
}

/** Viewport dimensions used to resolve percentage lengths. May hold NaN. */
interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Parse an SVG length. Percentages resolve against `reference` and yield NaN
 * when no usable viewport size is known (callers fall back to viewBox
 * dimensions instead of misreading e.g. "50%" as 50 user units).
 */
function resolveSvgLength(
  raw: string | null | undefined,
  reference: number | null
): number {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return Number.NaN;
  }
  if (trimmed.endsWith("%")) {
    const num = Number.parseFloat(trimmed);
    if (!Number.isFinite(num)) {
      return Number.NaN;
    }
    if (reference == null || !Number.isFinite(reference)) {
      return Number.NaN;
    }
    return (num / 100) * reference;
  }
  const num = Number.parseFloat(trimmed);
  return Number.isFinite(num) ? num : Number.NaN;
}

/** Determinable size of an `<svg>` viewport element, or null. */
function viewportSizeOfSvg(svgEl: Element): ViewportSize | null {
  const width = resolveSvgLength(svgEl.getAttribute("width"), null);
  const height = resolveSvgLength(svgEl.getAttribute("height"), null);
  if (Number.isFinite(width) && Number.isFinite(height)) {
    return { width, height };
  }
  // Percentage (or missing) dimensions: fall back to the viewBox extent.
  const viewBox = parseSvgViewBox(svgEl.getAttribute("viewBox"));
  if (viewBox) {
    return { width: viewBox.width, height: viewBox.height };
  }
  return null;
}

/**
 * Viewport hosting `useEl`: the nearest ancestor `<svg>` with a
 * determinable size, else the root. Null when nothing can be determined
 * (percentages then degrade to viewBox fallbacks downstream).
 */
function hostViewportOf(useEl: Element, svgRoot: Element): ViewportSize | null {
  let node: Element | null = useEl.parentElement;
  while (node) {
    if (tagOf(node) === "svg") {
      const size = viewportSizeOfSvg(node);
      if (size) {
        return size;
      }
    }
    if (node === svgRoot) {
      break;
    }
    node = node.parentElement;
  }
  return viewportSizeOfSvg(svgRoot);
}

function escapeIdForQuery(id: string): string | null {
  const css = (globalThis as { CSS?: { escape(value: string): string } }).CSS;
  if (css) {
    try {
      return css.escape(id);
    } catch {
      return null;
    }
  }
  // No CSS.escape (e.g. unit tests): fall back to a safe manual escape.
  if (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(id)) {
    return id;
  }
  return null;
}

function findElementById(svgRoot: Element, id: string): Element | null {
  // Prefer the in-root match so duplicate IDs in other inline SVGs on the
  // same page can't hijack the reference. Fall back to the document lookup
  // to support sprite sheets where <symbol> lives in a hidden SVG.
  const escaped = escapeIdForQuery(id);
  if (escaped) {
    try {
      const scoped = svgRoot.querySelector(`#${escaped}`);
      if (scoped) {
        return scoped;
      }
    } catch {
      // Fall through to document lookup.
    }
  } else {
    // IDs that can't be expressed as a selector: linear scan of the root.
    const stack: Element[] = [svgRoot];
    while (stack.length > 0) {
      const el = stack.pop();
      if (!el) {
        continue;
      }
      if (el !== svgRoot && el.getAttribute("id") === id) {
        return el;
      }
      const children = el.children;
      for (let i = children.length - 1; i >= 0; i -= 1) {
        const child = children[i];
        if (child) {
          stack.push(child as Element);
        }
      }
    }
    if (svgRoot.getAttribute("id") === id) {
      return svgRoot;
    }
  }
  const direct = svgRoot.ownerDocument?.getElementById(id) ?? null;
  return (direct as Element | null) ?? null;
}

function screenTransformOf(el: Element): Transform | null {
  try {
    const ctm = (el as unknown as SVGGraphicsElement).getScreenCTM?.();
    if (!ctm) {
      return null;
    }
    const parts = [ctm.a, ctm.b, ctm.c, ctm.d, ctm.e, ctm.f];
    if (!parts.every(Number.isFinite)) {
      return null;
    }
    return {
      m00: ctm.a,
      m01: ctm.c,
      m02: ctm.e,
      m10: ctm.b,
      m11: ctm.d,
      m12: ctm.f,
    };
  } catch {
    return null;
  }
}

/**
 * Direct element children in document order. Duck-types the collection so
 * unit-test doubles without a real DOM still work.
 */
function elementChildren(node: Element): Element[] {
  const out: Element[] = [];
  const kids = node.children as unknown as ArrayLike<Element>;
  const count = kids.length ?? 0;
  for (let i = 0; i < count; i += 1) {
    const kid = kids[i] as Element | undefined;
    if (kid && typeof kid.tagName === "string") {
      out.push(kid);
    }
  }
  return out;
}

interface UseResolutionContext {
  svgRoot: Element;
  /** Outermost use first; grows as nested uses resolve. */
  useChain: Element[];
  /** Ancestors of the outermost use up to the svg root, for paint fallback. */
  useAncestors: Element[];
  /** Inner paint chains (nested use + its in-symbol ancestors), innermost last. */
  innerPaintChains: Element[][];
  seenIds: Set<string>;
  depth: number;
}

function ancestorChain(el: Element, stop: Element | null): Element[] {
  const chain: Element[] = [];
  let node: Element | null = el.parentElement;
  while (node) {
    chain.push(node);
    if (node === stop) {
      break;
    }
    node = node.parentElement;
  }
  return chain;
}

/** Leaf-to-container paint chain, container included. */
function paintChainTo(leaf: Element, container: Element): Element[] {
  const chain: Element[] = [leaf];
  let node: Element | null = leaf.parentElement;
  while (node) {
    chain.push(node);
    if (node === container) {
      break;
    }
    node = node.parentElement;
  }
  return chain;
}

/**
 * Product of `transform` attributes from the container's child down to `el`
 * itself. The container's own transform is excluded (callers apply it once).
 */
function matrixFromAncestorChain(el: Element, stop: Element): Transform {
  const chain: Element[] = [];
  let node: Element | null = el;
  while (node && node !== stop) {
    chain.push(node);
    node = node.parentElement;
  }
  let result = identityTransform();
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    const item = chain[i];
    if (!item) {
      continue;
    }
    result = multiplyTransforms(
      result,
      parseSvgTransformAttr(item.getAttribute("transform"))
    );
  }
  return result;
}

/**
 * Paint declared directly on `el`: inline style first (it beats presentation
 * attributes in the cascade), then the presentation attribute. Returns null
 * when the element declares nothing, so callers keep walking outward.
 */
function elementPaintAttr(el: Element, name: string): string | null {
  try {
    const style = (
      el as unknown as {
        style?: { getPropertyValue(prop: string): string | null };
      }
    ).style;
    const inline = style?.getPropertyValue(name)?.trim();
    if (inline) {
      return inline;
    }
  } catch {
    // Non-DOM test doubles: fall through to attributes.
  }
  return el.getAttribute(name)?.trim() || null;
}

function firstPaintAttr(chains: Element[][], name: string): string | null {
  for (const chain of chains) {
    for (const el of chain) {
      const raw = elementPaintAttr(el, name);
      if (!raw || raw.toLowerCase() === "inherit") {
        continue;
      }
      return raw;
    }
  }
  return null;
}

/**
 * Stylesheet-origin paint for the referenced node. getComputedStyle folds
 * inheritance from the referenced ancestors automatically; the caller only
 * consults it when attributes/inline styles specify nothing.
 */
function computedPaintOf(el: Element, name: "fill" | "stroke"): string | null {
  try {
    const getStyle = (
      globalThis as {
        getComputedStyle?: (node: Element) => CSSStyleDeclaration;
      }
    ).getComputedStyle;
    if (typeof getStyle !== "function") {
      return null;
    }
    const value = getStyle(el)?.getPropertyValue(name)?.trim();
    if (!value || value.toLowerCase() === "inherit") {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/**
 * The CSS initial value of `fill` is black, which is also what an unstyled
 * node computes to. Exclude it so genuinely unstyled content still inherits
 * the `<use>` context instead of being pinned to black. (Explicit
 * `fill: black` via stylesheet + a conflicting use color is a known,
 * accepted corner.)
 */
const INITIAL_FILL_VALUES = new Set([
  "black",
  "#000",
  "#000000",
  "rgb(0,0,0)",
  "rgba(0,0,0,1)",
]);

function isInitialFillValue(value: string): boolean {
  return INITIAL_FILL_VALUES.has(value.toLowerCase().replace(/\s+/g, ""));
}

function paintChainsFor(
  refChain: Element[],
  ctx: UseResolutionContext
): Element[][] {
  const inner = [...ctx.innerPaintChains].reverse();
  const uses = [...ctx.useChain].reverse();
  return [refChain, ...inner, uses, ctx.useAncestors];
}

function primitiveAttrs(el: Element): SvgPrimitiveAttrs {
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

function pushResolvedGeometry(
  target: Element,
  refChain: Element[],
  base: Transform,
  ctx: UseResolutionContext,
  out: ResolvedUseShape[]
): void {
  const tag = tagOf(target);
  const subpaths = svgPrimitiveToSubpaths(tag, primitiveAttrs(target));
  if (subpaths.length === 0) {
    return;
  }
  const chains = paintChainsFor(refChain, ctx);
  const fillRule =
    firstPaintAttr(chains, "fill-rule") === "evenodd" ||
    firstPaintAttr(chains, "clip-rule") === "evenodd"
      ? "evenodd"
      : "nonzero";
  const fill = firstPaintAttr(chains, "fill");
  // Stylesheet-origin fill: only when nothing is declared, and only when it
  // carries author intent (see isInitialFillValue).
  let fillComputed: string | null = null;
  if (!fill) {
    const computed = computedPaintOf(target, "fill");
    if (computed && !isInitialFillValue(computed)) {
      fillComputed = computed;
    }
  }
  const stroke = firstPaintAttr(chains, "stroke");
  // Unspecified strokes compute to "none", which the caller already maps to
  // "no paint", so no initial-value guard is needed here.
  const strokeComputed = !stroke ? computedPaintOf(target, "stroke") : null;
  out.push({
    subpaths,
    transform: base,
    fill,
    fillComputed,
    fillRule,
    stroke,
    strokeComputed,
    strokeLineCap: firstPaintAttr(chains, "stroke-linecap"),
    strokeLineJoin: firstPaintAttr(chains, "stroke-linejoin"),
    strokeDasharray: firstPaintAttr(chains, "stroke-dasharray"),
    strokeWidth: firstPaintAttr(chains, "stroke-width"),
  });
}

function resolveTarget(
  target: Element,
  base: Transform,
  ctx: UseResolutionContext,
  out: ResolvedUseShape[],
  viewport: ViewportSize | null
): void {
  if (ctx.depth > MAX_USE_DEPTH) {
    return;
  }
  const tag = tagOf(target);

  if (GEOMETRY_TAGS.has(tag)) {
    const finalMatrix = multiplyTransforms(
      base,
      parseSvgTransformAttr(target.getAttribute("transform"))
    );
    pushResolvedGeometry(target, [target], finalMatrix, ctx, out);
    return;
  }

  if (tag === "symbol") {
    const viewBox = parseSvgViewBox(target.getAttribute("viewBox"));
    const refUse = ctx.useChain.at(-1);
    const widthAttr = refUse
      ? resolveSvgLength(refUse.getAttribute("width"), viewport?.width ?? null)
      : Number.NaN;
    const heightAttr = refUse
      ? resolveSvgLength(
          refUse.getAttribute("height"),
          viewport?.height ?? null
        )
      : Number.NaN;
    const viewportWidth = Number.isFinite(widthAttr)
      ? widthAttr
      : (viewBox?.width ?? 0);
    const viewportHeight = Number.isFinite(heightAttr)
      ? heightAttr
      : (viewBox?.height ?? 0);
    const aspect = parsePreserveAspectRatio(
      refUse?.getAttribute("preserveAspectRatio") ??
        target.getAttribute("preserveAspectRatio")
    );
    let next = multiplyTransforms(
      base,
      parseSvgTransformAttr(target.getAttribute("transform"))
    );
    if (viewBox) {
      next = multiplyTransforms(
        next,
        computeViewBoxTransform(
          viewBox,
          { x: 0, y: 0, width: viewportWidth, height: viewportHeight },
          aspect
        )
      );
    }
    resolveChildNodes(
      target,
      next,
      target,
      { width: viewportWidth, height: viewportHeight },
      ctx,
      out
    );
    return;
  }

  if (tag === "svg") {
    const x = resolveSvgLength(
      target.getAttribute("x"),
      viewport?.width ?? null
    );
    const y = resolveSvgLength(
      target.getAttribute("y"),
      viewport?.height ?? null
    );
    const width = resolveSvgLength(
      target.getAttribute("width"),
      viewport?.width ?? null
    );
    const height = resolveSvgLength(
      target.getAttribute("height"),
      viewport?.height ?? null
    );
    const viewBox = parseSvgViewBox(target.getAttribute("viewBox"));
    let next = multiplyTransforms(
      base,
      parseSvgTransformAttr(target.getAttribute("transform"))
    );
    next = multiplyTransforms(
      next,
      translateTransform(Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0)
    );
    if (viewBox && Number.isFinite(width) && Number.isFinite(height)) {
      next = multiplyTransforms(
        next,
        computeViewBoxTransform(
          viewBox,
          { x: 0, y: 0, width, height },
          parsePreserveAspectRatio(target.getAttribute("preserveAspectRatio"))
        )
      );
    }
    // Width/height default to 100%: unresolvable extents inherit the host.
    resolveChildNodes(
      target,
      next,
      target,
      {
        width: Number.isFinite(width) ? width : (viewport?.width ?? Number.NaN),
        height: Number.isFinite(height)
          ? height
          : (viewport?.height ?? Number.NaN),
      },
      ctx,
      out
    );
    return;
  }

  if (tag === "use") {
    // Nested use reached directly (defensive; container traversal handles the rest).
    const id = parseUseHref(
      target.getAttribute("href") ?? target.getAttribute("xlink:href")
    );
    if (!id || ctx.seenIds.has(id)) {
      return;
    }
    const nestedTarget = findElementById(ctx.svgRoot, id);
    if (!nestedTarget) {
      return;
    }
    // Recursion-stack semantics: allow the same id as a sibling later, but
    // block true cycles (A -> B -> A) while on the stack.
    ctx.seenIds.add(id);
    ctx.useChain.push(target);
    ctx.depth += 1;
    try {
      const useX = resolveSvgLength(
        target.getAttribute("x"),
        viewport?.width ?? null
      );
      const useY = resolveSvgLength(
        target.getAttribute("y"),
        viewport?.height ?? null
      );
      const nestedBase = multiplyTransforms(
        multiplyTransforms(
          base,
          parseSvgTransformAttr(target.getAttribute("transform"))
        ),
        translateTransform(
          Number.isFinite(useX) ? useX : 0,
          Number.isFinite(useY) ? useY : 0
        )
      );
      resolveTarget(nestedTarget, nestedBase, ctx, out, viewport);
    } finally {
      ctx.depth -= 1;
      ctx.useChain.pop();
      ctx.seenIds.delete(id);
    }
    return;
  }

  // Transparent containers (g, a, defs, switch, unknown): apply their own
  // transform once, then resolve children with per-descendant chains.
  const next = multiplyTransforms(
    base,
    parseSvgTransformAttr(target.getAttribute("transform"))
  );
  resolveChildNodes(target, next, target, viewport, ctx, out);
}

/**
 * Walk a container's children in document order so later content keeps its
 * SVG paint stacking above earlier content.
 *
 * - `node` is the element whose direct children are visited (descends
 *   transparently through g/a/switch without disturbing order);
 * - `base` is the transform accumulated up to `container`;
 * - `container` bounds the paint/matrix chains (a nested `<svg>` becomes the
 *   new container with viewport-aware geometry);
 * - `viewport` is the established viewport for percentage lengths.
 */
function resolveChildNodes(
  node: Element,
  base: Transform,
  container: Element,
  viewport: ViewportSize | null,
  ctx: UseResolutionContext,
  out: ResolvedUseShape[]
): void {
  for (const child of elementChildren(node)) {
    const tag = tagOf(child);
    // Nested definitions instantiate through <use> only; the directly
    // targeted container itself was already entered by the caller.
    if (DEFINITION_TAGS.has(tag)) {
      continue;
    }
    if (tag === "svg") {
      const x = resolveSvgLength(
        child.getAttribute("x"),
        viewport?.width ?? null
      );
      const y = resolveSvgLength(
        child.getAttribute("y"),
        viewport?.height ?? null
      );
      const width = resolveSvgLength(
        child.getAttribute("width"),
        viewport?.width ?? null
      );
      const height = resolveSvgLength(
        child.getAttribute("height"),
        viewport?.height ?? null
      );
      const viewBox = parseSvgViewBox(child.getAttribute("viewBox"));
      let nestedBase = multiplyTransforms(
        base,
        matrixFromAncestorChain(child, container)
      );
      nestedBase = multiplyTransforms(
        nestedBase,
        translateTransform(
          Number.isFinite(x) ? x : 0,
          Number.isFinite(y) ? y : 0
        )
      );
      if (viewBox && Number.isFinite(width) && Number.isFinite(height)) {
        nestedBase = multiplyTransforms(
          nestedBase,
          computeViewBoxTransform(
            viewBox,
            { x: 0, y: 0, width, height },
            parsePreserveAspectRatio(child.getAttribute("preserveAspectRatio"))
          )
        );
      }
      // Preserve paint inheritance across the viewport boundary.
      ctx.innerPaintChains.push(paintChainTo(child, container));
      try {
        resolveChildNodes(
          child,
          nestedBase,
          child,
          {
            width: Number.isFinite(width)
              ? width
              : (viewport?.width ?? Number.NaN),
            height: Number.isFinite(height)
              ? height
              : (viewport?.height ?? Number.NaN),
          },
          ctx,
          out
        );
      } finally {
        ctx.innerPaintChains.pop();
      }
      continue;
    }
    if (tag === "use") {
      const id = parseUseHref(
        child.getAttribute("href") ?? child.getAttribute("xlink:href")
      );
      if (!id || ctx.seenIds.has(id)) {
        continue;
      }
      const nestedTarget = findElementById(ctx.svgRoot, id);
      if (!nestedTarget) {
        continue;
      }
      ctx.seenIds.add(id);
      const useX = resolveSvgLength(
        child.getAttribute("x"),
        viewport?.width ?? null
      );
      const useY = resolveSvgLength(
        child.getAttribute("y"),
        viewport?.height ?? null
      );
      const nestedBase = multiplyTransforms(
        multiplyTransforms(base, matrixFromAncestorChain(child, container)),
        translateTransform(
          Number.isFinite(useX) ? useX : 0,
          Number.isFinite(useY) ? useY : 0
        )
      );
      ctx.innerPaintChains.push(paintChainTo(child, container));
      ctx.useChain.push(child);
      ctx.depth += 1;
      try {
        resolveTarget(nestedTarget, nestedBase, ctx, out, viewport);
      } finally {
        ctx.depth -= 1;
        ctx.useChain.pop();
        ctx.innerPaintChains.pop();
        ctx.seenIds.delete(id);
      }
      continue;
    }
    if (GEOMETRY_TAGS.has(tag)) {
      const finalMatrix = multiplyTransforms(
        base,
        matrixFromAncestorChain(child, container)
      );
      pushResolvedGeometry(
        child,
        paintChainTo(child, container),
        finalMatrix,
        ctx,
        out
      );
      continue;
    }
    // Transparent container: descend in place so siblings keep their order.
    // `base`/`container` are unchanged; the leaf folds the full chain, which
    // only spans transform attributes (viewport crossings always recurse).
    resolveChildNodes(child, base, container, viewport, ctx, out);
  }
}

/**
 * Resolve a rendered `<use>` element to absolute geometry shapes.
 *
 * Only local `#id` references are supported. Paints inherit from the
 * referenced node first, then from the use element and its ancestors, so the
 * caller can fall back to computed styles for anything still unspecified.
 * Unresolvable references yield no shapes (graceful fallback).
 */
export function resolveUseShapes(
  useEl: Element,
  svgRoot: Element
): ResolvedUseShape[] {
  const out: ResolvedUseShape[] = [];
  const id = parseUseHref(
    useEl.getAttribute("href") ?? useEl.getAttribute("xlink:href")
  );
  if (!id) {
    return out;
  }
  const target = findElementById(svgRoot, id);
  if (!target || target === useEl) {
    return out;
  }
  const screen = screenTransformOf(useEl);
  if (!screen) {
    return out;
  }
  // getScreenCTM() already folds the use element's own `transform` attribute
  // AND its supplemental x/y translation (SVG 1.1 §5.6: x/y append
  // translate(x,y) to the transform list), so use it directly. Appending
  // another translate(x,y) here would offset every instance twice.
  const base = screen;
  // Ancestor transforms above the referenced node do not apply to the
  // instance (only the use location does), so chains stop at the target.
  // The one exception is transparent containers, handled per-descendant.
  const ctx: UseResolutionContext = {
    svgRoot,
    useChain: [useEl],
    useAncestors: ancestorChain(useEl, svgRoot),
    innerPaintChains: [],
    seenIds: new Set([id]),
    depth: 0,
  };
  resolveTarget(target, base, ctx, out, hostViewportOf(useEl, svgRoot));
  return out;
}
