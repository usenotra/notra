import {
  BASE_LAYOUT_WIDTH_REM,
  GOOGLE_FONTS,
  LAYOUT_CONTAINERS_REM,
} from "../constants/theme";
import type { FontFace } from "../types/theme";
import { readableOn } from "../utils/color";
import { assetUrl, config } from "./params";

function fontStack(family: string | undefined, fallback: string): string {
  return family ? `"${family}", ${fallback}` : fallback;
}

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
  root.push(...layoutWidths());
  const image = background.image;
  const lightImage = assetUrl(typeof image === "string" ? image : image?.light);
  const darkImage = assetUrl(typeof image === "string" ? image : image?.dark);
  if (lightImage) {
    root.push(`--page-image: url(${JSON.stringify(lightImage)})`);
  }
  if (darkImage && darkImage !== lightImage) {
    dark.push(`--page-image: url(${JSON.stringify(darkImage)})`);
  }
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
  const css = `html:root{${root.join(";")}}${dark.length ? `html.dark{${dark.join(";")}}` : ""}`;
  return css.replaceAll("<", "\\3c ");
}

function layoutWidths(): string[] {
  const width = config.layout.width;
  if (width === BASE_LAYOUT_WIDTH_REM) {
    return [];
  }
  if (width === "full") {
    return ["--layout-index: 100%", "--layout-post: 100%"];
  }
  const scale = width / BASE_LAYOUT_WIDTH_REM;
  return Object.entries(LAYOUT_CONTAINERS_REM).map(
    ([name, rem]) =>
      `--layout-${name}: ${Math.round(rem * scale * 100) / 100}rem`
  );
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
