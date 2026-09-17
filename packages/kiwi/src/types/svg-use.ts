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
  /** Absolute transform to apply to subpath points. */
  transform: Transform;
  /** Raw fill paint from the attribute chain, or null when unspecified. */
  fill: string | null;
  /**
   * Stylesheet-origin fill for the referenced node (computed style), used
   * only when neither attributes nor inline styles specify a fill. Null when
   * unavailable or indistinguishable from the CSS initial value.
   */
  fillComputed: string | null;
  fillRule: "nonzero" | "evenodd";
  /** Raw stroke paint from the attribute chain, or null when unspecified. */
  stroke: string | null;
  /**
   * Stylesheet-origin stroke for the referenced node (computed style), used
   * only when neither attributes nor inline styles specify a stroke.
   */
  strokeComputed: string | null;
  strokeLineCap: string | null;
  strokeLineJoin: string | null;
  /** Raw dasharray attribute; the caller parses and scales it. */
  strokeDasharray: string | null;
  /** Raw stroke-width attribute; the caller parses and scales it. */
  strokeWidth: string | null;
}
