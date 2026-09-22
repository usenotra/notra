export const RGB_RE = /rgba?\(([^)]+)\)/;
export const HEX_RE = /^#([0-9a-f]{3,8})$/i;
export const LAYER_WORD_SPLIT_RE = /[-_\s]+/;
export const WHITESPACE_RE = /\s+/;
export const WHITESPACE_GLOBAL_RE = /\s+/g;

export const WEIGHT_TO_STYLE: Record<string, string> = {
  "100": "Thin",
  "200": "Extra Light",
  "300": "Light",
  "400": "Regular",
  normal: "Regular",
  "500": "Medium",
  "600": "Semi Bold",
  "700": "Bold",
  bold: "Bold",
  "800": "Extra Bold",
  "900": "Black",
};

export const TEXT_ALIGN_MAP: Record<string, string> = {
  left: "LEFT",
  right: "RIGHT",
  center: "CENTER",
  justify: "JUSTIFIED",
  start: "LEFT",
  end: "RIGHT",
};

export const IGNORED_TAGS = new Set([
  "script",
  "style",
  "meta",
  "link",
  "head",
]);
export const MAX_LAYER_NAME_LENGTH = 80;
export const SVG_GEOMETRY_SELECTOR =
  "path, circle, ellipse, rect, line, polyline, polygon";
export const SVG_NS = "http://www.w3.org/2000/svg";
export const SVG_USE_MAX_DEPTH = 8;
export const SVG_SYMBOL_VIEWPORT_ATTRS = ["viewBox", "preserveAspectRatio"];
export const SVG_USE_PLACEMENT_ATTRS = [
  "x",
  "y",
  "width",
  "height",
  "transform",
  "style",
  "class",
];
