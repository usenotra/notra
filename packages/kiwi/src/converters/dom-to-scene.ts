import type { Font } from "opentype.js";

import {
  SceneBuilder,
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
  SvgInfo,
  SvgShape,
} from "../types/dom-to-scene";
import type { Guid, Transform } from "../types/scene";
import type { PathSubpath } from "../types/svg-path";
import type { ResolvedUseShape } from "../types/svg-use";
import { svgPrimitiveToSubpaths } from "../utils/svg-primitive";
import { resolveUseShapes } from "../utils/svg-use";
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
  const previous = colorParseContext.fillStyle;
  colorParseContext.fillStyle = "#000";
  colorParseContext.fillStyle = value;
  const normalized = colorParseContext.fillStyle;
  colorParseContext.fillStyle = previous;
  return normalized === "#000" && value.trim().toLowerCase() !== "#000"
    ? null
    : normalized;
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

function pushSvgShape(
  shapes: SvgShape[],
  subpaths: PathSubpath[],
  shape: Omit<SvgShape, "subpaths">,
  matrix: Transform
): void {
  if (subpaths.length === 0) {
    return;
  }
  const transformed: PathSubpath[] = subpaths.map((sub) => ({
    closed: sub.closed,
    points: sub.points.map((p) => ({
      x: matrix.m00 * p.x + matrix.m01 * p.y + matrix.m02,
      y: matrix.m10 * p.x + matrix.m11 * p.y + matrix.m12,
    })),
  }));
  const strokeScale = Math.hypot(matrix.m00, matrix.m10) || 1;
  shapes.push({
    subpaths: transformed,
    fill: shape.fill,
    fillRule: shape.fillRule,
    stroke: shape.stroke,
    strokeLineCap: shape.strokeLineCap,
    strokeLineJoin: shape.strokeLineJoin,
    strokeDasharray:
      shape.strokeDasharray?.map((dash) => dash * strokeScale) ?? null,
    strokeWidth: shape.strokeWidth * strokeScale,
  });
}

function pushResolvedUseShape(
  shapes: SvgShape[],
  resolved: ResolvedUseShape,
  useStyle: CSSStyleDeclaration,
  currentColor: string
): void {
  if (resolved.subpaths.length === 0) {
    return;
  }
  const fill = svgPaintValue(
    resolved.fill ?? resolved.fillComputed,
    useStyle.fill ?? null,
    currentColor
  );
  const stroke = svgPaintValue(
    resolved.stroke ?? resolved.strokeComputed,
    useStyle.stroke ?? null,
    currentColor
  );
  if (!fill && !stroke) {
    return;
  }
  const fillRule: "nonzero" | "evenodd" = resolved.fillRule;
  pushSvgShape(
    shapes,
    resolved.subpaths,
    {
      fill,
      fillRule,
      stroke,
      strokeLineCap: resolved.strokeLineCap ?? useStyle.strokeLinecap,
      strokeLineJoin: resolved.strokeLineJoin ?? useStyle.strokeLinejoin,
      strokeDasharray:
        parseSvgDasharray(resolved.strokeDasharray) ??
        parseSvgDasharray(useStyle.getPropertyValue("stroke-dasharray")) ??
        null,
      strokeWidth: parsePx(resolved.strokeWidth ?? useStyle.strokeWidth),
    },
    resolved.transform
  );
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
    const style = getComputedStyle(svg);
    const svgFill = svg.getAttribute("fill");
    const svgStroke = svg.getAttribute("stroke");
    const fallbackColor = style.color;

    const shapes: SvgShape[] = [];
    const geomEls = svg.querySelectorAll(SVG_GEOMETRY_SELECTOR);
    for (const geomEl of geomEls) {
      if (!(geomEl instanceof SVGGraphicsElement)) {
        continue;
      }
      if (geomEl.closest("defs, symbol")) {
        continue;
      }
      const ctm = geomEl.getScreenCTM();
      if (!ctm) {
        continue;
      }
      const subpaths = svgPrimitiveToSubpaths(geomEl.tagName.toLowerCase(), {
        d: geomEl.getAttribute("d"),
        cx: geomEl.getAttribute("cx"),
        cy: geomEl.getAttribute("cy"),
        r: geomEl.getAttribute("r"),
        rx: geomEl.getAttribute("rx"),
        ry: geomEl.getAttribute("ry"),
        x: geomEl.getAttribute("x"),
        y: geomEl.getAttribute("y"),
        width: geomEl.getAttribute("width"),
        height: geomEl.getAttribute("height"),
        x1: geomEl.getAttribute("x1"),
        y1: geomEl.getAttribute("y1"),
        x2: geomEl.getAttribute("x2"),
        y2: geomEl.getAttribute("y2"),
        points: geomEl.getAttribute("points"),
      });
      if (subpaths.length === 0) {
        continue;
      }
      const geomStyle = getComputedStyle(geomEl);
      const geomFill = geomEl.getAttribute("fill");
      const geomStroke = geomEl.getAttribute("stroke");
      const stroke = svgPaintValue(
        geomStroke,
        svgStroke ?? geomStyle.stroke,
        fallbackColor
      );
      const strokeDasharray =
        parseSvgDasharray(geomEl.getAttribute("stroke-dasharray")) ??
        parseSvgDasharray(svg.getAttribute("stroke-dasharray")) ??
        parseSvgDasharray(geomStyle.getPropertyValue("stroke-dasharray"));
      const fill = svgPaintValue(
        geomFill,
        svgFill ?? (stroke || geomStroke || svgStroke ? null : geomStyle.fill),
        fallbackColor
      );
      if (!fill && !stroke) {
        continue;
      }
      const fillRule: "nonzero" | "evenodd" =
        geomEl.getAttribute("fill-rule") === "evenodd" ||
        geomEl.getAttribute("clip-rule") === "evenodd"
          ? "evenodd"
          : "nonzero";
      pushSvgShape(
        shapes,
        subpaths,
        {
          fill,
          fillRule,
          stroke,
          strokeLineCap:
            geomEl.getAttribute("stroke-linecap") ??
            svg.getAttribute("stroke-linecap") ??
            geomStyle.strokeLinecap,
          strokeLineJoin:
            geomEl.getAttribute("stroke-linejoin") ??
            svg.getAttribute("stroke-linejoin") ??
            geomStyle.strokeLinejoin,
          strokeDasharray: strokeDasharray ?? null,
          strokeWidth: parsePx(
            geomEl.getAttribute("stroke-width") ??
              svg.getAttribute("stroke-width") ??
              geomStyle.strokeWidth
          ),
        },
        {
          m00: ctm.a,
          m01: ctm.c,
          m02: ctm.e,
          m10: ctm.b,
          m11: ctm.d,
          m12: ctm.f,
        }
      );
    }

    for (const useEl of Array.from(svg.querySelectorAll("use"))) {
      if (!(useEl instanceof Element)) {
        continue;
      }
      if (useEl.closest("defs, symbol")) {
        continue;
      }
      let resolved: ResolvedUseShape[];
      try {
        resolved = resolveUseShapes(useEl, svg);
      } catch {
        continue;
      }
      if (resolved.length === 0) {
        continue;
      }
      const useStyle = getComputedStyle(useEl);
      const useColor = useStyle.color || fallbackColor;
      for (const shape of resolved) {
        pushResolvedUseShape(shapes, shape, useStyle, useColor);
      }
    }

    return {
      kind: "svg",
      name: explicitElementName(svg) ?? leadingCommentName(svg) ?? "Icon",
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      transform: transformAt(rect.left, rect.top),
      background: style.backgroundColor,
      color: fallbackColor,
      shapes,
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
  });

  for (let index = 0; index < svgNode.shapes.length; index += 1) {
    const shape = svgNode.shapes[index];
    if (!shape) {
      continue;
    }
    const suffix = svgNode.shapes.length > 1 ? ` ${index + 1}` : "";
    emitSvgSubpaths(
      sb,
      shape,
      shape.subpaths,
      frameGuid,
      svgNode.x,
      svgNode.y,
      `${svgNode.name} Shape${suffix}`
    );
  }
}

function emitSvgSubpaths(
  sb: SceneBuilder,
  shape: SvgShape,
  subpaths: PathSubpath[],
  parent: Guid,
  parentX: number,
  parentY: number,
  name: string
): void {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const sub of subpaths) {
    for (const p of sub.points) {
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
  if (!Number.isFinite(minX)) {
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
