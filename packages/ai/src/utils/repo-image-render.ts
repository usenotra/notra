import {
  DISPLAY_STYLE_RE,
  FONT_SPECS,
  GOOGLE_FONT_URL_REGEX,
  LEADING_STYLE_SEPARATOR_RE,
  REPO_IMAGE_HEIGHT,
  REPO_IMAGE_WIDTH,
  SATORI_VALID_DISPLAY,
  STYLE_ATTR_RE,
} from "@notra/ai/constants/repo-image";
import type { VNode } from "@notra/ai/types/repo-image-render";
import { logWarn } from "@notra/ai/utils/server-log";
import { Resvg } from "@resvg/resvg-js";
import { createElement, Fragment, type ReactNode } from "react";
import satori from "satori";
import { html as parseHtml } from "satori-html";

const fontCache = new Map<string, ArrayBuffer>();

async function loadGoogleFont(familySpec: string): Promise<ArrayBuffer> {
  const cached = fontCache.get(familySpec);
  if (cached) {
    return cached;
  }

  const url = `https://fonts.googleapis.com/css2?family=${familySpec.replace(
    / /g,
    "+"
  )}`;

  const cssResponse = await fetch(url);
  if (!cssResponse.ok) {
    throw new Error(`Failed to fetch Google Font CSS for ${familySpec}`);
  }

  const css = await cssResponse.text();
  const fontUrl = css.match(GOOGLE_FONT_URL_REGEX)?.[1];
  if (!fontUrl) {
    throw new Error(`Failed to resolve font URL for ${familySpec}`);
  }

  const fontResponse = await fetch(fontUrl);
  if (!fontResponse.ok) {
    throw new Error(`Failed to fetch font file for ${familySpec}`);
  }

  const buffer = await fontResponse.arrayBuffer();
  fontCache.set(familySpec, buffer);
  return buffer;
}

async function loadAllFonts() {
  const results = await Promise.allSettled(
    FONT_SPECS.map(async (spec) => ({
      name: spec.name,
      weight: spec.weight,
      style: "normal" as const,
      data: await loadGoogleFont(spec.family),
    }))
  );
  const loaded = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  if (loaded.length === 0) {
    throw new Error("Failed to load any fonts for repo image rendering");
  }

  for (const result of results) {
    if (result.status === "rejected") {
      logWarn("[repo-image] Failed to load font", {
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      });
    }
  }

  return loaded;
}

function injectDisplayFlexInHtml(htmlSource: string): string {
  return htmlSource.replace(/<div\b([^>]*)>/gi, (match, rawAttrs: string) => {
    const styleMatch = rawAttrs.match(STYLE_ATTR_RE);

    if (styleMatch) {
      const quote = styleMatch[1] ?? '"';
      const styleBody = styleMatch[2] ?? "";
      if (DISPLAY_STYLE_RE.test(styleBody)) {
        return match;
      }
      const newStyle = `display:flex;${styleBody.replace(
        LEADING_STYLE_SEPARATOR_RE,
        ""
      )}`;
      const newAttrs = rawAttrs.replace(
        STYLE_ATTR_RE,
        `style=${quote}${newStyle}${quote}`
      );
      return `<div${newAttrs}>`;
    }

    const trailing = rawAttrs.endsWith("/") ? rawAttrs.slice(0, -1) : rawAttrs;
    return `<div${trailing} style="display:flex">`;
  });
}

function isVNode(value: unknown): value is VNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "props" in value
  );
}

function enforceSatoriDisplay(node: unknown) {
  if (!isVNode(node)) {
    return;
  }
  const children = node.props?.children;

  if (Array.isArray(children)) {
    for (const child of children) {
      enforceSatoriDisplay(child);
    }
  } else if (isVNode(children)) {
    enforceSatoriDisplay(children);
  }

  if (node.type !== "div") {
    return;
  }

  if (!node.props) {
    node.props = {};
  }
  const props = node.props;
  if (!props.style) {
    props.style = {};
  }
  const style = props.style;
  const display = style.display;
  if (typeof display !== "string" || !SATORI_VALID_DISPLAY.has(display)) {
    style.display = "flex";
  }
}

function toReactNode(value: unknown): ReactNode {
  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return createElement(
      Fragment,
      null,
      ...value.map((child, index) =>
        createElement(Fragment, { key: index }, toReactNode(child))
      )
    );
  }

  if (!isVNode(value) || !value.type) {
    return null;
  }

  const { children, ...props } = value.props ?? {};
  const childNodes = Array.isArray(children) ? children : [children];
  return createElement(
    value.type,
    props,
    ...childNodes.map((child) => toReactNode(child))
  );
}

export async function renderHtmlToImages(htmlSource: string) {
  const safeHtml = injectDisplayFlexInHtml(htmlSource);
  const rawTree = parseHtml(safeHtml);
  enforceSatoriDisplay(rawTree);
  const tree = toReactNode(rawTree);
  const fonts = await loadAllFonts();

  const svg = await satori(tree, {
    width: REPO_IMAGE_WIDTH,
    height: REPO_IMAGE_HEIGHT,
    fonts,
  });

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: REPO_IMAGE_WIDTH },
  })
    .render()
    .asPng();

  return {
    svg,
    pngBase64: png.toString("base64"),
  };
}
