import type { SvgStyling } from "./dom-to-scene";
import type { PathSubpath } from "./svg-path";

export interface Affine {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface ClipBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ParsedDropShadow {
  dx: number;
  dy: number;
  blur: number;
  color: string | null;
}

export interface CssFunction {
  name: string;
  args: string;
}

export type StyleGetter = (el: Element) => CSSStyleDeclaration;

export interface ClipRef {
  id: string;
  ref: Element;
}

export type MaskChildTone = "skip" | "light" | "dark";

export interface MaskPaint {
  tone: MaskChildTone;
  alpha: number;
  strokeWidth: number | null;
}

export interface ClipChildSource {
  el: Element;
  subs: PathSubpath[];
  evenOdd: boolean;
  dark: boolean;
  alpha: number;
}

export interface ClipSource {
  id: string;
  kind: "clip" | "mask";
  container: Element;
  children: ClipChildSource[];
}

export interface ShapeAncestorGroup extends SvgStyling {
  ancestor: Element;
}

export interface ShapeStyling extends SvgStyling {
  group: ShapeAncestorGroup | null;
}
