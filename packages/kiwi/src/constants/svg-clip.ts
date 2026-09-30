import type { SvgShape } from "../types/dom-to-scene";
import type { RGBA } from "../types/scene";
import type { Affine, MaskPaint } from "../types/svg-clip";

export const URL_REF_RE = /url\(\s*["']?#([^"')\s]+)["']?\s*\)/i;
export const CSS_LENGTH_RE = /^(-?\d*\.?\d+(?:[eE][+-]?\d+)?)(px)?$/;
export const OPACITY_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?$/i;
export const SVG_TRANSFORM_FN_RE = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
export const SVG_TRANSFORM_NUM_RE = /-?\d*\.?\d+(?:[eE][+-]?\d+)?/g;

export const IDENTITY_AFFINE: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export const BLEND_MODE_MAP: Record<string, string> = {
  multiply: "MULTIPLY",
  screen: "SCREEN",
  overlay: "OVERLAY",
  darken: "DARKEN",
  lighten: "LIGHTEN",
  "color-dodge": "COLOR_DODGE",
  "color-burn": "COLOR_BURN",
  "hard-light": "HARD_LIGHT",
  "soft-light": "SOFT_LIGHT",
  difference: "DIFFERENCE",
  exclusion: "EXCLUSION",
  hue: "HUE",
  saturation: "SATURATION",
  color: "COLOR",
  luminosity: "LUMINOSITY",
  "plus-lighter": "LINEAR_DODGE",
};

export const DEFAULT_SHADOW_COLOR: RGBA = [0, 0, 0, 0.5];
export const DEFAULT_DROP_SHADOW_DX = 0;
export const DEFAULT_DROP_SHADOW_DY = 4;
export const DEFAULT_DROP_SHADOW_BLUR = 4;

export const MASK_DARK_LUMINANCE = 0.5;
export const CLIP_CHILD_PAINT: MaskPaint = {
  tone: "light",
  alpha: 1,
  strokeWidth: null,
};
export const DEFAULT_STROKE_WIDTH = 1;
export const RECT_CLIP_TOLERANCE = 0.5;
export const GEOMETRY_EPSILON = 1e-9;
export const CLIP_FINGERPRINT_DIGITS = 3;

export const CLIP_MASK_SHAPE: SvgShape = {
  subpaths: [],
  fill: "#ffffff",
  fillRule: "nonzero",
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
};
