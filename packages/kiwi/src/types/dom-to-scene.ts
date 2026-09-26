import type { FigmaEffect, Transform } from "./scene";
import type { PathSubpath } from "./svg-path";

export interface BuildSceneFromElementOptions {
  name?: string;
}

export interface BorderSide {
  color: string;
  width: number;
}

export interface BoxBorders {
  top: BorderSide;
  right: BorderSide;
  bottom: BorderSide;
  left: BorderSide;
}

export interface ElementInfo {
  kind: "element";
  name: string;
  tag: string;
  x: number;
  y: number;
  width: number;
  height: number;
  transform: Transform;
  background: string;
  cornerRadii: [number, number, number, number];
  borders: BoxBorders;
  children: LayoutNode[];
}

export interface TextInfo {
  kind: "text";
  name: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  textAlign: string;
  wrapped: boolean;
  parentX: number;
  parentY: number;
  parentWidth: number;
  parentHeight: number;
}

export interface SvgShape {
  subpaths: PathSubpath[];
  fill: string | null;
  fillRule: "nonzero" | "evenodd";
  stroke: string | null;
  strokeLineCap: string;
  strokeLineJoin: string;
  strokeDasharray: number[] | null;
  strokeWidth: number;
  clipChain: string[];
  effectGroup: string | null;
  filterOutside: boolean;
  opacity: number | undefined;
  blendMode: string | undefined;
  effects: FigmaEffect[];
}

export interface SvgClip {
  id: string;
  subpaths: PathSubpath[];
  fillRule: "nonzero" | "evenodd";
}

export interface SvgEffectGroup {
  id: string;
  effects: FigmaEffect[];
  opacity: number | undefined;
  blendMode: string | undefined;
}

export interface SvgInfo {
  kind: "svg";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  transform: Transform;
  background: string;
  color: string;
  shapes: SvgShape[];
  clips: SvgClip[];
  effectGroups: SvgEffectGroup[];
  /** Mirror the SVG viewport: clip overflowing content unless overflow is visible. */
  clipsContent: boolean;
  opacity: number | undefined;
  blendMode: string | undefined;
  effects: FigmaEffect[];
}

export type LayoutNode = ElementInfo | TextInfo | SvgInfo;
