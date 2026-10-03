import { assetUrl, config } from "./params";

const GOOGLE_FONTS = "https://fonts.googleapis.com/css2";

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3 ? [...value].map((char) => char + char).join("") : value;
  const number = Number.parseInt(full, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

/** WCAG relative luminance; picks white or near-black text for a brand color. */
function readableOn(hex: string): string {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.42 ? "hsl(0 0% 9%)" : "oklch(0.997 0 0)";
}

function fontStack(family: string | undefined, fallback: string): string {
  return family ? `"${family}", ${fallback}` : fallback;
}

/** Inline `:root` / `.dark` overrides for the brand colors, background and fonts from notra.json. */
export function themeStyle(): string {
  const { colors, background, fonts } = config;
  const button = colors.dark ?? colors.primary;
  const root = [
    `--primary: ${colors.primary}`,
    `--primary-dark-mode: ${colors.light ?? colors.primary}`,
    `--primary-button: ${button}`,
    `--primary-foreground: ${readableOn(button)}`,
  ];
  const dark: string[] = [];
  if (background.color?.light) {
    root.push(`--page-background: ${background.color.light}`);
  }
  if (background.color?.dark) {
    dark.push(`--page-background: ${background.color.dark}`);
  }
  const body = fonts?.body?.family ?? fonts?.family;
  const heading = fonts?.heading?.family ?? fonts?.family;
  if (body) {
    root.push(
      `--font-body: ${fontStack(body, "ui-sans-serif, system-ui, sans-serif")}`
    );
  }
  if (heading) {
    root.push(`--font-heading: ${fontStack(heading, "var(--font-body)")}`);
  }
  // `html:root` / `html.dark` outrank the theme stylesheet's `:root` / `.dark`, which loads later.
  return `html:root{${root.join(";")}}${dark.length ? `html.dark{${dark.join(";")}}` : ""}`;
}

interface FontFace {
  family: string;
  weight?: number;
  source?: string;
  format?: string;
}

function declaredFonts(): FontFace[] {
  const fonts = config.fonts;
  if (!fonts) {
    return [];
  }
  const all: FontFace[] = [];
  for (const spec of [fonts, fonts.body, fonts.heading]) {
    if (spec?.family && !all.some((font) => font.family === spec.family)) {
      all.push({
        family: spec.family,
        weight: spec.weight,
        source: spec.source,
        format: spec.format,
      });
    }
  }
  return all;
}

/** Self-hosted fonts become @font-face rules; everything else loads from Google Fonts. */
export function fontFaces(): string {
  return declaredFonts()
    .filter((font) => font.source)
    .map((font) => {
      const url = assetUrl(font.source) ?? font.source;
      return `@font-face{font-family:"${font.family}";src:url("${url}") format("${font.format ?? "woff2"}");font-weight:${font.weight ?? "100 900"};font-display:swap}`;
    })
    .join("");
}

export function googleFontsUrl(): string | null {
  const families = declaredFonts().filter((font) => !font.source);
  if (families.length === 0) {
    return null;
  }
  const query = families
    .map(
      (font) =>
        `family=${encodeURIComponent(font.family).replaceAll("%20", "+")}:wght@${font.weight ?? "300..800"}`
    )
    .join("&");
  return `${GOOGLE_FONTS}?${query}&display=swap`;
}

export function decorationClass(): string {
  return config.background.decoration === "none"
    ? ""
    : `decoration-${config.background.decoration}`;
}

export function logoFor(mode: "light" | "dark"): string | undefined {
  const logo = config.logo;
  return assetUrl(typeof logo === "string" ? logo : logo?.[mode]);
}

export function faviconFor(mode: "light" | "dark"): string | undefined {
  const favicon = config.favicon;
  return assetUrl(typeof favicon === "string" ? favicon : favicon?.[mode]);
}
