import type { Transform } from "./scene";
import type { PathSubpath } from "./svg-path";

export interface SvgUseViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SvgViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export type SvgAspectMode = "meet" | "slice" | "none";

export interface SvgPreserveAspectRatio {
  xAlign: number;
  yAlign: number;
  mode: SvgAspectMode;
}

export interface ResolvedUseShape {
  subpaths: PathSubpath[];
  transform: Transform;
  fill: string | null;
  fillComputed: string | null;
  fillRule: "nonzero" | "evenodd";
  stroke: string | null;
  strokeComputed: string | null;
  strokeLineCap: string | null;
  strokeLineJoin: string | null;
  strokeDasharray: string | null;
  strokeWidth: string | null;
}
