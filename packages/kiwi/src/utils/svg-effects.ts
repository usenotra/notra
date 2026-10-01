import { dropShadowEffect, layerBlurEffect } from "../builders/scene-builder";
import {
  DEFAULT_DROP_SHADOW_BLUR,
  DEFAULT_DROP_SHADOW_DX,
  DEFAULT_DROP_SHADOW_DY,
  DEFAULT_SHADOW_COLOR,
} from "../constants/svg-clip";
import type { SvgStyling } from "../types/dom-to-scene";
import type { FigmaEffect, RGBA } from "../types/scene";
import type {
  ShapeAncestorGroup,
  ShapeStyling,
  StyleGetter,
} from "../types/svg-clip";
import { parseColor } from "./css-color";
import {
  parseBlendMode,
  parseCssLength,
  parseDropShadowArgs,
  parseOpacityValue,
  parseUrlRef,
  splitCssFunctions,
} from "./css-value";

function numberAttr(el: Element, name: string, fallback: number): number {
  const value = Number.parseFloat(el.getAttribute(name) ?? `${fallback}`);
  return Number.isFinite(value) ? value : 0;
}

function filterElementEffects(filterEl: Element): FigmaEffect[] {
  const [only] = filterEl.children;
  if (filterEl.children.length !== 1 || !only) {
    return [];
  }
  const tag = only.tagName.toLowerCase();
  if (tag === "fedropshadow") {
    const [r, g, b, a] =
      parseColor(only.getAttribute("flood-color") ?? "") ??
      DEFAULT_SHADOW_COLOR;
    const alpha = parseOpacityValue(only.getAttribute("flood-opacity")) ?? a;
    return [
      dropShadowEffect({
        dx: numberAttr(only, "dx", DEFAULT_DROP_SHADOW_DX),
        dy: numberAttr(only, "dy", DEFAULT_DROP_SHADOW_DY),
        blur: numberAttr(only, "stdDeviation", DEFAULT_DROP_SHADOW_BLUR),
        color: [r, g, b, alpha],
      }),
    ];
  }
  const blur = numberAttr(only, "stdDeviation", 0);
  return tag === "fegaussianblur" && blur > 0 ? [layerBlurEffect(blur)] : [];
}

function cssFilterEffects(value: string, currentColor: RGBA): FigmaEffect[] {
  const effects: FigmaEffect[] = [];
  let blur: number | null = null;
  for (const { name, args } of splitCssFunctions(value)) {
    const fn = name.toLowerCase();
    if (fn === "drop-shadow") {
      const shadow = parseDropShadowArgs(args);
      if (shadow) {
        effects.push(
          dropShadowEffect({
            dx: shadow.dx,
            dy: shadow.dy,
            blur: shadow.blur,
            color: shadow.color
              ? (parseColor(shadow.color) ?? currentColor)
              : currentColor,
          })
        );
      }
    } else if (fn === "blur" && blur === null) {
      blur = parseCssLength(args);
    }
  }
  if (blur !== null && blur > 0) {
    effects.push(layerBlurEffect(blur));
  }
  return effects;
}

function filterEffects(
  el: Element,
  style: CSSStyleDeclaration,
  svg: SVGSVGElement
): FigmaEffect[] {
  const filter =
    style.getPropertyValue("filter") || el.getAttribute("filter") || "";
  const ref = parseUrlRef(filter);
  const filterEl = ref
    ? Array.from(svg.querySelectorAll("filter")).find((f) => f.id === ref)
    : undefined;
  const currentColor = parseColor(style.color) ?? DEFAULT_SHADOW_COLOR;
  return [
    ...(filterEl ? filterElementEffects(filterEl) : []),
    ...cssFilterEffects(filter, currentColor),
  ];
}

export function svgElementStyling(
  el: Element,
  style: CSSStyleDeclaration,
  svg: SVGSVGElement
): SvgStyling {
  const opacity =
    parseOpacityValue(style.getPropertyValue("opacity")) ??
    parseOpacityValue(el.getAttribute("opacity"));
  return {
    opacity: opacity !== undefined && opacity < 1 ? opacity : undefined,
    blendMode: parseBlendMode(style.getPropertyValue("mix-blend-mode")),
    effects: filterEffects(el, style, svg),
  };
}

export function svgShapeStyling(
  el: Element,
  svg: SVGSVGElement,
  getStyle: StyleGetter
): ShapeStyling {
  const ancestors: Element[] = [];
  for (
    let node: Element | null = el.parentElement;
    node && node !== svg;
    node = node.parentElement
  ) {
    ancestors.unshift(node);
  }
  let opacity = 1;
  let blendMode: string | undefined;
  const effects: FigmaEffect[] = [];
  let ancestor: Element | null = null;
  for (const node of ancestors) {
    const level = svgElementStyling(node, getStyle(node), svg);
    opacity *= level.opacity ?? 1;
    blendMode = level.blendMode ?? blendMode;
    effects.push(...level.effects);
    if (
      level.effects.length > 0 ||
      level.opacity !== undefined ||
      level.blendMode
    ) {
      ancestor = node;
    }
  }
  const group: ShapeAncestorGroup | null = ancestor
    ? {
        ancestor,
        effects,
        opacity: opacity < 1 ? opacity : undefined,
        blendMode,
      }
    : null;
  return { ...svgElementStyling(el, getStyle(el), svg), group };
}
