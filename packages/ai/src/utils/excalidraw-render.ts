import {
  DIAGRAM_ARROWHEAD_ANGLE_DEG,
  DIAGRAM_ARROWHEAD_LENGTH,
  DIAGRAM_CANVAS_PADDING,
  DIAGRAM_FONT_GOOGLE_FAMILY,
  DIAGRAM_LINE_HEIGHT,
  DIAGRAM_ROUNDED_CORNER_RADIUS,
  DIAGRAM_ROUNDED_CORNER_RATIO,
} from "@notra/ai/constants/excalidraw-diagram";
import {
  REPO_IMAGE_HEIGHT,
  REPO_IMAGE_WIDTH,
} from "@notra/ai/constants/repo-image";
import { diagramSpecSchema } from "@notra/ai/schemas/excalidraw-diagram";
import type {
  DiagramSpec,
  DiagramTextMeasurer,
  ExcalidrawElement,
  ExcalidrawLinearElement,
  ExcalidrawScene,
  ExcalidrawShapeElement,
  ExcalidrawTextElement,
  RenderedDiagram,
} from "@notra/ai/types/excalidraw-diagram";
import {
  buildExcalidrawScene,
  rotatedBox,
} from "@notra/ai/utils/excalidraw-diagram";
import { loadGoogleFont } from "@notra/ai/utils/repo-image-render";
import { Resvg } from "@resvg/resvg-js";
// biome-ignore lint/performance/noNamespaceImport: opentype.js is UMD; see parseFont
import * as opentype from "opentype.js";
import type { Font, PathCommand } from "opentype.js";
import rough from "roughjs";
import type { Options as RoughOptions } from "roughjs/bin/core";

type Point = [number, number];
type RoughGenerator = ReturnType<typeof rough.generator>;
type Drawable = ReturnType<RoughGenerator["line"]>;

// Excalidraw caps how far a small diagram is blown up; we do the same so a
// three-box diagram does not render with 60px labels.
const MAX_RENDER_SCALE = 1.6;

// Bundlers expose opentype.js's named exports, but Node's CommonJS interop
// (Vite SSR, externalized server deps) only sees its UMD default export.
const parseFont: typeof opentype.parse =
  opentype.parse ??
  (opentype as unknown as { default: typeof opentype }).default.parse;

let fontPromise: Promise<Font> | null = null;

function loadDiagramFont(): Promise<Font> {
  fontPromise ??= loadGoogleFont(DIAGRAM_FONT_GOOGLE_FAMILY)
    .then((buffer) => parseFont(buffer))
    .catch((error: unknown) => {
      fontPromise = null;
      throw error;
    });
  return fontPromise;
}

// opentype.js shaping (ccmp/liga) throws on some Google Fonts lookups, so lay
// out glyphs one by one with plain kerning, like @notra/kiwi does.
function lineGlyphs(font: Font, line: string) {
  return Array.from(line, (char) => font.charToGlyph(char));
}

function lineAdvance(font: Font, line: string, fontSize: number) {
  const scale = fontSize / font.unitsPerEm;
  const glyphs = lineGlyphs(font, line);
  return glyphs.reduce((width, glyph, index) => {
    const next = glyphs[index + 1];
    const kerning = next ? font.getKerningValue(glyph, next) : 0;
    return width + ((glyph.advanceWidth ?? 0) + kerning) * scale;
  }, 0);
}

// opentype.js 2.0 `toPathData` emits NaN for some coordinates, so serialize
// the commands ourselves.
function pathCommandsToData(commands: PathCommand[]) {
  const n = (value: number) => value.toFixed(2);
  return commands
    .map((command) => {
      switch (command.type) {
        case "M":
        case "L":
          return `${command.type}${n(command.x)} ${n(command.y)}`;
        case "Q":
          return `Q${n(command.x1)} ${n(command.y1)} ${n(command.x)} ${n(command.y)}`;
        case "C":
          return `C${n(command.x1)} ${n(command.y1)} ${n(command.x2)} ${n(command.y2)} ${n(command.x)} ${n(command.y)}`;
        default:
          return "Z";
      }
    })
    .join("");
}

function linePathData(
  font: Font,
  line: string,
  x: number,
  baseline: number,
  fontSize: number
) {
  const scale = fontSize / font.unitsPerEm;
  const glyphs = lineGlyphs(font, line);
  let cursor = x;
  return glyphs
    .map((glyph, index) => {
      const data = pathCommandsToData(
        glyph.getPath(cursor, baseline, fontSize).commands
      );
      const next = glyphs[index + 1];
      const kerning = next ? font.getKerningValue(glyph, next) : 0;
      cursor += ((glyph.advanceWidth ?? 0) + kerning) * scale;
      return data;
    })
    .join(" ");
}

function createMeasurer(font: Font): DiagramTextMeasurer {
  return {
    measure(text, fontSize) {
      const lines = text.split("\n");
      const width = Math.max(
        ...lines.map((line) => lineAdvance(font, line, fontSize))
      );
      return {
        width,
        height: lines.length * fontSize * DIAGRAM_LINE_HEIGHT,
      };
    },
  };
}

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function dashArray(element: ExcalidrawElement): string | null {
  if (element.strokeStyle === "dashed") {
    return `8 ${8 + element.strokeWidth}`;
  }
  if (element.strokeStyle === "dotted") {
    return `1.5 ${6 + element.strokeWidth}`;
  }
  return null;
}

function roughOptions(element: ExcalidrawElement): RoughOptions {
  const hasFill =
    element.type !== "arrow" &&
    element.type !== "line" &&
    element.backgroundColor !== "transparent";
  return {
    seed: element.seed,
    roughness: element.roughness,
    stroke: element.strokeColor,
    strokeWidth: element.strokeWidth,
    fill: hasFill ? element.backgroundColor : undefined,
    fillStyle: element.fillStyle,
    fillWeight: element.strokeWidth / 2,
    hachureGap: element.strokeWidth * 4,
    // Excalidraw draws dashed strokes with a single pass so the dashes stay crisp.
    disableMultiStroke: element.strokeStyle !== "solid",
    preserveVertices: element.roughness < 2,
  };
}

function drawableToSvg(
  generator: RoughGenerator,
  drawable: Drawable,
  dash: string | null
): string {
  return generator
    .toPaths(drawable)
    .map((path) => {
      const isStroke = path.stroke !== "none";
      const attributes = [
        `d="${path.d}"`,
        `fill="${escapeAttribute(path.fill ?? "none")}"`,
        `stroke="${escapeAttribute(path.stroke)}"`,
        `stroke-width="${path.strokeWidth}"`,
        'stroke-linecap="round"',
        'stroke-linejoin="round"',
        isStroke && dash ? `stroke-dasharray="${dash}"` : "",
      ];
      return `<path ${attributes.filter(Boolean).join(" ")}/>`;
    })
    .join("");
}

function roundedRectPath(element: ExcalidrawShapeElement): string {
  const { x, y, width: w, height: h } = element;
  const r = Math.min(
    DIAGRAM_ROUNDED_CORNER_RADIUS,
    Math.min(w, h) * DIAGRAM_ROUNDED_CORNER_RATIO
  );
  return [
    `M ${x + r} ${y}`,
    `L ${x + w - r} ${y}`,
    `Q ${x + w} ${y}, ${x + w} ${y + r}`,
    `L ${x + w} ${y + h - r}`,
    `Q ${x + w} ${y + h}, ${x + w - r} ${y + h}`,
    `L ${x + r} ${y + h}`,
    `Q ${x} ${y + h}, ${x} ${y + h - r}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y}, ${x + r} ${y}`,
  ].join(" ");
}

function renderShape(
  generator: RoughGenerator,
  element: ExcalidrawShapeElement
): string {
  const options = roughOptions(element);
  const { x, y, width: w, height: h } = element;
  let drawable: Drawable;
  if (element.type === "ellipse") {
    drawable = generator.ellipse(x + w / 2, y + h / 2, w, h, options);
  } else if (element.type === "diamond") {
    drawable = generator.polygon(
      [
        [x + w / 2, y],
        [x + w, y + h / 2],
        [x + w / 2, y + h],
        [x, y + h / 2],
      ],
      options
    );
  } else if (element.roundness) {
    drawable = generator.path(roundedRectPath(element), options);
  } else {
    drawable = generator.rectangle(x, y, w, h, options);
  }
  return drawableToSvg(generator, drawable, dashArray(element));
}

function arrowheadSvg(
  generator: RoughGenerator,
  element: ExcalidrawLinearElement,
  tip: Point,
  from: Point,
  kind: NonNullable<ExcalidrawLinearElement["endArrowhead"]>
): string {
  const angle = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const length = DIAGRAM_ARROWHEAD_LENGTH + element.strokeWidth * 2;
  const spread = (DIAGRAM_ARROWHEAD_ANGLE_DEG * Math.PI) / 180;
  const wing = (direction: number): Point => [
    tip[0] - length * Math.cos(angle + direction * spread),
    tip[1] - length * Math.sin(angle + direction * spread),
  ];
  const options: RoughOptions = {
    ...roughOptions(element),
    fill: element.strokeColor,
    fillStyle: "solid",
    disableMultiStroke: false,
  };

  let drawable: Drawable;
  if (kind === "triangle") {
    drawable = generator.polygon([tip, wing(1), wing(-1)], options);
  } else if (kind === "dot") {
    const radius = length / 3;
    drawable = generator.circle(
      tip[0] - radius * Math.cos(angle),
      tip[1] - radius * Math.sin(angle),
      radius * 2,
      options
    );
  } else if (kind === "bar") {
    const half = length / 2;
    drawable = generator.line(
      tip[0] - half * Math.sin(angle),
      tip[1] + half * Math.cos(angle),
      tip[0] + half * Math.sin(angle),
      tip[1] - half * Math.cos(angle),
      options
    );
  } else {
    drawable = generator.linearPath([wing(1), tip, wing(-1)], {
      ...options,
      fill: undefined,
    });
  }
  return drawableToSvg(generator, drawable, null);
}

function renderLinear(
  generator: RoughGenerator,
  element: ExcalidrawLinearElement
): string {
  const absolute = element.points.map(
    ([px, py]) => [element.x + px, element.y + py] as Point
  );
  const options = roughOptions(element);
  const body =
    element.roundness && absolute.length > 2
      ? generator.curve(absolute, options)
      : generator.linearPath(absolute, options);
  let svg = drawableToSvg(generator, body, dashArray(element));

  const last = absolute.at(-1);
  const beforeLast = absolute.at(-2);
  if (element.endArrowhead && last && beforeLast) {
    svg += arrowheadSvg(
      generator,
      element,
      last,
      beforeLast,
      element.endArrowhead
    );
  }
  const first = absolute[0];
  const second = absolute[1];
  if (element.startArrowhead && first && second) {
    svg += arrowheadSvg(
      generator,
      element,
      first,
      second,
      element.startArrowhead
    );
  }
  return svg;
}

function renderText(
  font: Font,
  element: ExcalidrawTextElement,
  background: string | null
): string {
  const scale = element.fontSize / font.unitsPerEm;
  const ascent = font.ascender * scale;
  const glyphHeight = (font.ascender - font.descender) * scale;
  const lineHeightPx = element.fontSize * element.lineHeight;
  const lines = element.text.split("\n");

  // Arrow labels sit on the line, so knock the line out behind them.
  const knockout = background
    ? `<rect x="${element.x - 4}" y="${element.y - 2}" width="${element.width + 8}" height="${element.height + 4}" rx="4" fill="${escapeAttribute(background)}"/>`
    : "";

  const paths = lines.map((line, index) => {
    const lineWidth = lineAdvance(font, line, element.fontSize);
    let x = element.x;
    if (element.textAlign === "center") {
      x += (element.width - lineWidth) / 2;
    } else if (element.textAlign === "right") {
      x += element.width - lineWidth;
    }
    const baseline =
      element.y +
      index * lineHeightPx +
      (lineHeightPx - glyphHeight) / 2 +
      ascent;
    return linePathData(font, line, x, baseline, element.fontSize);
  });

  return `${knockout}<path d="${paths.join(" ")}" fill="${escapeAttribute(element.strokeColor)}"/>`;
}

function isLinearElement(
  element: ExcalidrawElement
): element is ExcalidrawLinearElement {
  return element.type === "arrow" || element.type === "line";
}

function sceneBounds(elements: ExcalidrawElement[]) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const include = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const element of elements) {
    if (isLinearElement(element)) {
      for (const [px, py] of element.points) {
        include(element.x + px, element.y + py);
      }
    } else {
      const box = rotatedBox(element);
      include(box.x, box.y);
      include(box.x + box.width, box.y + box.height);
    }
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

export function renderExcalidrawSceneToSvg(
  scene: ExcalidrawScene,
  font: Font
): string {
  const generator = rough.generator();
  const background = scene.appState.viewBackgroundColor;
  const bounds = sceneBounds(scene.elements);
  const scale = Math.min(
    MAX_RENDER_SCALE,
    (REPO_IMAGE_WIDTH - DIAGRAM_CANVAS_PADDING * 2) / Math.max(1, bounds.width),
    (REPO_IMAGE_HEIGHT - DIAGRAM_CANVAS_PADDING * 2) /
      Math.max(1, bounds.height)
  );
  const offsetX =
    (REPO_IMAGE_WIDTH - bounds.width * scale) / 2 - bounds.minX * scale;
  const offsetY =
    (REPO_IMAGE_HEIGHT - bounds.height * scale) / 2 - bounds.minY * scale;
  const linearIds = new Set(
    scene.elements.filter(isLinearElement).map((element) => element.id)
  );

  const body = scene.elements
    .map((element) => {
      let markup: string;
      if (element.type === "text") {
        const onArrow =
          element.containerId !== null && linearIds.has(element.containerId);
        markup = renderText(font, element, onArrow ? background : null);
      } else if (isLinearElement(element)) {
        markup = renderLinear(generator, element);
      } else {
        markup = renderShape(generator, element);
      }
      if (!isLinearElement(element) && element.angle !== 0) {
        const cx = element.x + element.width / 2;
        const cy = element.y + element.height / 2;
        const degrees = (element.angle * 180) / Math.PI;
        markup = `<g transform="rotate(${degrees.toFixed(3)} ${cx.toFixed(2)} ${cy.toFixed(2)})">${markup}</g>`;
      }
      return element.opacity < 100
        ? `<g opacity="${element.opacity / 100}">${markup}</g>`
        : markup;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${REPO_IMAGE_WIDTH}" height="${REPO_IMAGE_HEIGHT}" viewBox="0 0 ${REPO_IMAGE_WIDTH} ${REPO_IMAGE_HEIGHT}"><rect width="${REPO_IMAGE_WIDTH}" height="${REPO_IMAGE_HEIGHT}" fill="${escapeAttribute(background)}"/><g transform="translate(${offsetX.toFixed(2)} ${offsetY.toFixed(2)}) scale(${scale.toFixed(4)})">${body}</g></svg>`;
}

/** Parses the agent's diagram.json, expands it to an Excalidraw scene, and renders PNG + SVG. */
export function renderDiagramSpec(rawSpec: string): Promise<RenderedDiagram> {
  return renderDiagram(diagramSpecSchema.parse(JSON.parse(rawSpec)));
}

/** Expands a validated spec to an Excalidraw scene and renders PNG + SVG. */
export async function renderDiagram(
  spec: DiagramSpec
): Promise<RenderedDiagram> {
  const font = await loadDiagramFont();
  const scene = buildExcalidrawScene(spec, createMeasurer(font));
  const svg = renderExcalidrawSceneToSvg(scene, font);
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: REPO_IMAGE_WIDTH },
  })
    .render()
    .asPng();

  return {
    spec,
    scene,
    svg,
    // Wrapping the SVG keeps the existing Figma/Paper clipboard exports working.
    html: `<div style="width:${REPO_IMAGE_WIDTH}px;height:${REPO_IMAGE_HEIGHT}px;display:flex">${svg}</div>`,
    pngBase64: png.toString("base64"),
  };
}
