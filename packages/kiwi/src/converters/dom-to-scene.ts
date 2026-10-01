import type { Font } from "opentype.js";

import {
  SceneBuilder,
  solidFill,
  transformAt,
} from "../builders/scene-builder";
import {
  IGNORED_TAGS,
  LAYER_WORD_SPLIT_RE,
  MAX_LAYER_NAME_LENGTH,
  SVG_GEOMETRY_SELECTOR,
  TEXT_ALIGN_MAP,
  WEIGHT_TO_STYLE,
  WHITESPACE_GLOBAL_RE,
  WHITESPACE_RE,
} from "../constants/dom-to-scene";
import { CLIP_MASK_SHAPE, IDENTITY_AFFINE } from "../constants/svg-clip";
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
import type { Guid, Transform } from "../types/scene";
import type { PathSubpath } from "../types/svg-path";
import { parseColor } from "../utils/css-color";
import { isRectClip, subpathBounds } from "../utils/polygon";
import {
  collectSvgClipSources,
  createStyleCache,
  resolveClip,
  svgClipRefs,
  svgShapeRuns,
} from "../utils/svg-clip";
import { svgElementStyling, svgShapeStyling } from "../utils/svg-effects";
import {
  svgPrimitiveAttrs,
  svgPrimitiveToSubpaths,
} from "../utils/svg-primitive";
import { inlineSvgUses } from "../utils/svg-use";
import { TextLayoutCache } from "../utils/text-layout";

export type { BuildSceneFromElementOptions } from "../types/dom-to-scene";

const SVG_DASH_SEPARATOR_RE = /[\s,]+/;
const SVG_DASH_LENGTH_RE = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:px)?$/i;

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
    const getStyle = createStyleCache();
    const style = getStyle(svg);
    const svgFill = svg.getAttribute("fill");
    const svgStroke = svg.getAttribute("stroke");
    const fallbackColor = style.color;

    const shapes: SvgShape[] = [];
    const restoreUses = inlineSvgUses(svg);
    const clipSources = collectSvgClipSources(svg, getStyle);
    const clipRoot = svg.getScreenCTM() ?? IDENTITY_AFFINE;
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
        svgPrimitiveAttrs(geomEl)
      );
      if (subpaths.length === 0) {
        continue;
      }
      const geomStyle = getStyle(geomEl);
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
        geomEl.getAttribute("clip-rule") === "evenodd" ||
        geomStyle.getPropertyValue("fill-rule").trim() === "evenodd" ||
        geomStyle.getPropertyValue("clip-rule").trim() === "evenodd"
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
      const clipRefs = svgClipRefs(geomEl, svg, getStyle);
      const clipChain = clipRefs.flatMap(({ id, ref }) => {
        const source = clipSources.get(id);
        const key =
          source && resolveClip(source, ref, svg, clipRoot, resolvedClips);
        return key ? [key] : [];
      });
      const { group, ...styling } = svgShapeStyling(geomEl, svg, getStyle);
      let effectGroup: string | null = null;
      if (group) {
        const { ancestor, ...groupStyling } = group;
        effectGroup =
          effectGroupIds.get(ancestor) ??
          `effect-group-${effectGroupIds.size + 1}`;
        if (!effectGroupIds.has(ancestor)) {
          effectGroupIds.set(ancestor, effectGroup);
          effectGroups.push({ id: effectGroup, ...groupStyling });
        }
      }
      const filterOutside =
        group !== null &&
        clipRefs.every(({ ref }) => group.ancestor.contains(ref));
      shapes.push({
        subpaths: transformed,
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
        strokeDasharray:
          strokeDasharray?.map((dash) => dash * strokeScale) ?? null,
        strokeWidth:
          parsePx(
            geomEl.getAttribute("stroke-width") ??
              svg.getAttribute("stroke-width") ??
              geomStyle.strokeWidth
          ) * strokeScale,
        clipChain,
        effectGroup,
        filterOutside,
        ...styling,
      });
    }
    restoreUses();

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
      clips: [...resolvedClips.values()],
      effectGroups,
      clipsContent: style.getPropertyValue("overflow").trim() !== "visible",
      ...svgElementStyling(svg, style, svg),
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
    effects: svgNode.effects,
  });

  const clips = new Map(svgNode.clips.map((clip) => [clip.id, clip]));
  const groups = new Map(
    svgNode.effectGroups.map((group) => [group.id, group])
  );

  const addClipContainers = (
    chain: SvgClip[],
    parentGuid: Guid
  ): { guid: Guid; x: number; y: number; width: number; height: number } => {
    let container = {
      guid: parentGuid,
      x: svgNode.x,
      y: svgNode.y,
      width: svgNode.width,
      height: svgNode.height,
    };
    for (const clip of chain) {
      const bounds = subpathBounds(clip.subpaths);
      if (!bounds) {
        continue;
      }
      const isRect = clip.opacity >= 1 && isRectClip(clip.subpaths);
      const next = {
        x: bounds.minX,
        y: bounds.minY,
        width: Math.max(1, bounds.maxX - bounds.minX),
        height: Math.max(1, bounds.maxY - bounds.minY),
      };
      const guid = sb.addFrame({
        parent: container.guid,
        name: `${svgNode.name} Clip`,
        x: next.x - container.x,
        y: next.y - container.y,
        width: next.width,
        height: next.height,
        clipsContent: isRect,
      });
      if (!isRect) {
        emitSvgSubpaths(
          sb,
          {
            ...CLIP_MASK_SHAPE,
            fillRule: clip.fillRule,
            opacity: clip.opacity < 1 ? clip.opacity : undefined,
          },
          clip.subpaths,
          guid,
          next.x,
          next.y,
          `${svgNode.name} Mask`,
          true
        );
      }
      container = { guid, ...next };
    }
    return container;
  };

  let shapeNumber = 0;
  for (const run of svgShapeRuns(svgNode.shapes)) {
    const [first] = run;
    if (!first) {
      continue;
    }
    const group = first.effectGroup ? groups.get(first.effectGroup) : undefined;
    const outerEffects = group && first.filterOutside ? group.effects : [];
    const innerEffects = group && !first.filterOutside ? group.effects : [];
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
        effects: outerEffects,
        opacity: group.opacity,
        blendMode: group.blendMode,
      });
    }
    const chain = first.clipChain.flatMap((id) => clips.get(id) ?? []);
    const container = addClipContainers(chain, runParent);
    const shapeParent =
      innerEffects.length > 0
        ? sb.addFrame({
            parent: container.guid,
            name: `${svgNode.name} Filter`,
            x: 0,
            y: 0,
            width: container.width,
            height: container.height,
            effects: innerEffects,
          })
        : container.guid;
    for (const shape of run) {
      shapeNumber += 1;
      const suffix = svgNode.shapes.length > 1 ? ` ${shapeNumber}` : "";
      emitSvgSubpaths(
        sb,
        shape,
        shape.subpaths,
        shapeParent,
        container.x,
        container.y,
        `${svgNode.name} Shape${suffix}`
      );
    }
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
  mask = false
): void {
  const bounds = subpathBounds(subpaths);
  if (!bounds) {
    return;
  }
  const { minX, minY, maxX, maxY } = bounds;
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
    effects: shape.effects,
    mask,
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
