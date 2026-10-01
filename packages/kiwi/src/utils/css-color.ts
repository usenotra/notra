import {
  HEX_RE,
  RGB_ALPHA_SLASH_RE,
  RGB_RE,
  WHITESPACE_RE,
} from "../constants/dom-to-scene";
import type { RGBA } from "../types/scene";

export function normalizeCssColorWithContext(
  value: string,
  context: Pick<CanvasRenderingContext2D, "fillStyle">
): string | null {
  const previous = context.fillStyle;
  try {
    context.fillStyle = "#010203";
    context.fillStyle = value;
    const first = context.fillStyle;

    context.fillStyle = "#040506";
    context.fillStyle = value;
    const second = context.fillStyle;

    return typeof first === "string" && first === second ? first : null;
  } finally {
    context.fillStyle = previous;
  }
}

let colorParseContext: CanvasRenderingContext2D | null | undefined;

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function parseColorChannel(value: string): number {
  const trimmed = value.trim();
  const parsed = Number.parseFloat(trimmed);
  return clampUnit(trimmed.endsWith("%") ? parsed / 100 : parsed / 255);
}

function parseAlphaChannel(value: string | undefined): number {
  if (value === undefined) {
    return 1;
  }
  const trimmed = value.trim();
  const parsed = Number.parseFloat(trimmed);
  return clampUnit(trimmed.endsWith("%") ? parsed / 100 : parsed);
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
  return normalizeCssColorWithContext(value, colorParseContext);
}

function parseKnownColor(s: string): RGBA | null {
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
        .replace(RGB_ALPHA_SLASH_RE, " ")
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

export function parseColor(s: string): RGBA | null {
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
