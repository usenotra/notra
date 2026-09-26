import type { VectorNetwork } from "./vector-network";

export interface Guid {
  sessionID: number;
  localID: number;
}

export interface Transform {
  m00: number;
  m01: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface SolidFill {
  type: "SOLID";
  color: Color;
  opacity: number;
  visible: boolean;
  blendMode: string;
}

export type RGBA = [number, number, number, number];

export interface TextBaseline {
  position: { x: number; y: number };
  width: number;
  lineY: number;
  lineHeight: number;
  lineAscent: number;
  firstCharacter: number;
  endCharacter: number;
}

export interface TextGlyph {
  commandsBlob: number;
  position: { x: number; y: number };
  fontSize: number;
  firstCharacter: number;
  advance: number;
  rotation: number;
}

export interface DerivedTextData {
  layoutSize: { x: number; y: number };
  baselines: TextBaseline[];
  glyphs: TextGlyph[];
  fontMetaData?: Array<{
    key: { family: string; style: string; postscript: string };
    fontLineHeight: number;
    fontStyle: string;
    fontWeight: number;
  }>;
  truncationStartIndex?: number;
  truncatedHeight?: number;
  logicalIndexToCharacterOffsetMap?: number[];
}

export interface SceneNode {
  [key: string]: unknown;
  guid: Guid;
}

export interface FigmaEffect {
  type: string;
  visible?: boolean;
  blendMode?: string;
  color?: { r: number; g: number; b: number; a: number };
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  opacity?: number;
  showShadowBehindNode?: boolean;
}

export interface AddFrameOptions {
  parent?: Guid;
  name?: string;
  x?: number;
  y?: number;
  transform?: Transform;
  width: number;
  height: number;
  fill?: SolidFill | null;
  stroke?: SolidFill | null;
  strokeWeight?: number;
  cornerRadii?: [number, number, number, number];
  stackMode?: string;
  stackSpacing?: number;
  padding?: [number, number, number, number];
  clipsContent?: boolean;
  opacity?: number;
  blendMode?: string;
  effects?: FigmaEffect[];
  mask?: boolean | null;
  maskType?: string | null;
}

export interface AddTextOptions {
  parent: Guid;
  name?: string;
  text: string;
  x?: number;
  y?: number;
  transform?: Transform;
  width?: number;
  height?: number;
  fontFamily?: string;
  fontStyle?: string;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  color?: RGBA;
  alignHorizontal?: string;
  alignVertical?: string;
  autoResize?: string;
  derivedTextData?: DerivedTextData;
}

export interface AddVectorOptions {
  parent: Guid;
  name?: string;
  x?: number;
  y?: number;
  transform?: Transform;
  width: number;
  height: number;
  fill?: SolidFill | null;
  stroke?: SolidFill | null;
  strokeCap?: string;
  dashPattern?: number[];
  strokeJoin?: string;
  strokeWeight?: number;
  network: VectorNetwork;
  opacity?: number;
  blendMode?: string;
  effects?: FigmaEffect[];
  mask?: boolean | null;
  maskType?: string | null;
}
