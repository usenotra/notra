import {
  DIAGRAM_ARROW_LABEL_FONT_SIZE,
  DIAGRAM_BINDING_GAP,
  DIAGRAM_DEFAULT_BACKGROUND,
  DIAGRAM_DEFAULT_FONT_SIZE,
  DIAGRAM_DEFAULT_ROUGHNESS,
  DIAGRAM_DEFAULT_STROKE,
  DIAGRAM_DEFAULT_STROKE_WIDTH,
  DIAGRAM_DIAMOND_LABEL_FACTOR,
  DIAGRAM_ELLIPSE_LABEL_FACTOR,
  DIAGRAM_LINE_HEIGHT,
  DIAGRAM_MIN_SHAPE_HEIGHT,
  DIAGRAM_MIN_SHAPE_WIDTH,
  DIAGRAM_SHAPE_PADDING,
  EXCALIDRAW_FONT_FAMILY_NUNITO,
  EXCALIDRAW_ROUNDNESS_ADAPTIVE,
  EXCALIDRAW_ROUNDNESS_PROPORTIONAL,
  EXCALIDRAW_SCENE_SOURCE,
} from "@notra/ai/constants/excalidraw-diagram";
import type {
  DiagramLinearSpec,
  DiagramShapeGeometry,
  DiagramShapeSpec,
  DiagramSpec,
  DiagramSpecElement,
  DiagramTextMeasurer,
  DiagramTextSpec,
  ExcalidrawArrowhead,
  ExcalidrawElement,
  ExcalidrawElementBase,
  ExcalidrawLinearElement,
  ExcalidrawScene,
  ExcalidrawShapeElement,
  ExcalidrawTextElement,
} from "@notra/ai/types/excalidraw-diagram";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

type Point = [number, number];

/** The agent-authored spec is invalid; the message is fed back to the agent. */
export class DiagramSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiagramSpecError";
  }
}

export function isDiagramSpecError(error: unknown) {
  return (
    error instanceof DiagramSpecError ||
    error instanceof SyntaxError ||
    error instanceof z.ZodError
  );
}

export function describeDiagramSpecError(error: unknown) {
  if (error instanceof z.ZodError) {
    return z.prettifyError(error);
  }
  return error instanceof Error ? error.message : String(error);
}

const CARRIAGE_RETURN_REGEX = /\r\n?/g;

const LABEL_FACTORS: Record<DiagramShapeSpec["type"], number> = {
  rectangle: 1,
  ellipse: DIAGRAM_ELLIPSE_LABEL_FACTOR,
  diamond: DIAGRAM_DIAMOND_LABEL_FACTOR,
};

// Stable per-id seed so re-rendering the same scene draws the same strokes.
function seedFromId(id: string): number {
  let hash = 2_166_136_261;
  for (const char of id) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return Math.abs(hash) % 2_147_483_647 || 1;
}

function baseElement(
  id: string,
  spec: DiagramSpecElement,
  geometry: { x: number; y: number; width: number; height: number }
): ExcalidrawElementBase {
  const seed = seedFromId(id);
  return {
    id,
    ...geometry,
    angle: ("angle" in spec ? spec.angle : undefined) ?? 0,
    strokeColor: spec.strokeColor ?? DIAGRAM_DEFAULT_STROKE,
    backgroundColor: spec.backgroundColor ?? "transparent",
    fillStyle: spec.fillStyle ?? "solid",
    strokeWidth: spec.strokeWidth ?? DIAGRAM_DEFAULT_STROKE_WIDTH,
    strokeStyle: spec.strokeStyle ?? "solid",
    roughness: spec.roughness ?? DIAGRAM_DEFAULT_ROUGHNESS,
    opacity: spec.opacity ?? 100,
    groupIds: [],
    frameId: null,
    index: null,
    roundness: null,
    seed,
    version: 1,
    versionNonce: seedFromId(`${id}:nonce`),
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
  };
}

function buildTextElement(params: {
  id: string;
  text: string;
  fontSize: number;
  strokeColor: string;
  x: number;
  y: number;
  textAlign: ExcalidrawTextElement["textAlign"];
  verticalAlign: ExcalidrawTextElement["verticalAlign"];
  containerId: string | null;
  measurer: DiagramTextMeasurer;
  centerOnPoint?: boolean;
}): ExcalidrawTextElement {
  // Nunito has no glyph for a tab, and a stray \r shifts the line.
  const text = params.text
    .replace(CARRIAGE_RETURN_REGEX, "\n")
    .replaceAll("\t", "    ");
  const size = params.measurer.measure(text, params.fontSize);
  const x = params.centerOnPoint ? params.x - size.width / 2 : params.x;
  const y = params.centerOnPoint ? params.y - size.height / 2 : params.y;
  return {
    ...baseElement(
      params.id,
      { type: "text", x, y, text },
      { x, y, width: size.width, height: size.height }
    ),
    strokeColor: params.strokeColor,
    type: "text",
    text,
    originalText: text,
    fontSize: params.fontSize,
    fontFamily: EXCALIDRAW_FONT_FAMILY_NUNITO,
    textAlign: params.textAlign,
    verticalAlign: params.verticalAlign,
    containerId: params.containerId,
    lineHeight: DIAGRAM_LINE_HEIGHT,
    autoResize: true,
  };
}

function buildShape(
  id: string,
  spec: DiagramShapeSpec,
  measurer: DiagramTextMeasurer
): { shape: ExcalidrawShapeElement; label: ExcalidrawTextElement | null } {
  const labelFontSize = spec.label?.fontSize ?? DIAGRAM_DEFAULT_FONT_SIZE;
  const labelSize = spec.label?.text
    ? measurer.measure(spec.label.text, labelFontSize)
    : { width: 0, height: 0 };
  const factor = LABEL_FACTORS[spec.type];
  const width = Math.max(
    spec.width ?? 0,
    DIAGRAM_MIN_SHAPE_WIDTH,
    labelSize.width * factor + DIAGRAM_SHAPE_PADDING * 2
  );
  const height = Math.max(
    spec.height ?? 0,
    DIAGRAM_MIN_SHAPE_HEIGHT,
    labelSize.height * factor + DIAGRAM_SHAPE_PADDING * 2
  );
  // Grow around the authored center so neighbours keep their spacing.
  const x = spec.x - (width - (spec.width ?? width)) / 2;
  const y = spec.y - (height - (spec.height ?? height)) / 2;

  let roundness: ExcalidrawShapeElement["roundness"] = null;
  if (spec.type === "rectangle" && spec.rounded !== false) {
    roundness = { type: EXCALIDRAW_ROUNDNESS_ADAPTIVE };
  } else if (spec.type === "diamond" && spec.rounded) {
    roundness = { type: EXCALIDRAW_ROUNDNESS_PROPORTIONAL };
  }

  const shape: ExcalidrawShapeElement = {
    ...baseElement(id, spec, { x, y, width, height }),
    type: spec.type,
    roundness,
  };

  if (!spec.label?.text) {
    return { shape, label: null };
  }

  const label = buildTextElement({
    id: `${id}-label`,
    text: spec.label.text,
    fontSize: labelFontSize,
    strokeColor: spec.label.strokeColor ?? shape.strokeColor,
    x: x + width / 2,
    y: y + height / 2,
    textAlign: "center",
    verticalAlign: "middle",
    containerId: id,
    measurer,
    centerOnPoint: true,
  });
  // Excalidraw rotates a container's text together with it.
  label.angle = shape.angle;
  shape.boundElements = [{ id: label.id, type: "text" }];
  return { shape, label };
}

export function shapeCenter(shape: DiagramShapeGeometry): Point {
  return [shape.x + shape.width / 2, shape.y + shape.height / 2];
}

/** Axis-aligned box around an element after its rotation (unchanged at angle 0). */
export function rotatedBox(element: {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
}) {
  if (element.angle === 0) {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
  }
  const cos = Math.abs(Math.cos(element.angle));
  const sin = Math.abs(Math.sin(element.angle));
  const width = element.width * cos + element.height * sin;
  const height = element.width * sin + element.height * cos;
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}

function rotatePoint([px, py]: Point, [cx, cy]: Point, angle: number): Point {
  if (angle === 0) {
    return [px, py];
  }
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - cx;
  const dy = py - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

/** Where an arrow bound to `shape` starts or ends: its anchor, or the edge facing `toward`. */
export function boundPoint(
  shape: DiagramShapeGeometry,
  anchor: [number, number] | undefined,
  toward: Point
): Point {
  const center = shapeCenter(shape);
  if (anchor) {
    return rotatePoint(
      [shape.x + anchor[0] * shape.width, shape.y + anchor[1] * shape.height],
      center,
      shape.angle
    );
  }
  // Intersect in the shape's own frame, then rotate back.
  const local = edgePoint(shape, rotatePoint(toward, center, -shape.angle));
  return rotatePoint(local, center, shape.angle);
}

/** Point where the ray from the shape center toward `toward` leaves the outline, plus a gap. */
function edgePoint(shape: DiagramShapeGeometry, toward: Point): Point {
  const [cx, cy] = shapeCenter(shape);
  const dx = toward[0] - cx;
  const dy = toward[1] - cy;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return [cx, cy];
  }
  const hw = shape.width / 2;
  const hh = shape.height / 2;
  let t: number;
  if (shape.type === "ellipse") {
    t = 1 / Math.hypot(dx / hw, dy / hh);
  } else if (shape.type === "diamond") {
    t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
  } else {
    t = Math.min(
      dx === 0 ? Number.POSITIVE_INFINITY : hw / Math.abs(dx),
      dy === 0 ? Number.POSITIVE_INFINITY : hh / Math.abs(dy)
    );
  }
  const gap = DIAGRAM_BINDING_GAP / length;
  return [cx + dx * (t + gap), cy + dy * (t + gap)];
}

function polylineMidpoint(points: Point[]): Point {
  const segments = points.slice(1).map((point, index) => {
    const previous = points[index] as Point;
    return {
      from: previous,
      to: point,
      length: Math.hypot(point[0] - previous[0], point[1] - previous[1]),
    };
  });
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  let remaining = total / 2;
  for (const segment of segments) {
    if (remaining <= segment.length && segment.length > 0) {
      const ratio = remaining / segment.length;
      return [
        segment.from[0] + (segment.to[0] - segment.from[0]) * ratio,
        segment.from[1] + (segment.to[1] - segment.from[1]) * ratio,
      ];
    }
    remaining -= segment.length;
  }
  return points[0] ?? [0, 0];
}

function readAnchor(
  endpoint: DiagramLinearSpec["start"]
): [number, number] | undefined {
  return "anchor" in endpoint ? endpoint.anchor : undefined;
}

function readFocus(endpoint: DiagramLinearSpec["start"]) {
  return "anchor" in endpoint && endpoint.anchor ? (endpoint.focus ?? 0) : 0;
}

function toArrowhead(
  value: DiagramLinearSpec["startArrowhead"],
  fallback: ExcalidrawArrowhead
): ExcalidrawArrowhead {
  if (value === undefined) {
    return fallback;
  }
  return value === "none" ? null : value;
}

function buildLinear(
  id: string,
  spec: DiagramLinearSpec,
  shapes: Map<string, ExcalidrawShapeElement>,
  measurer: DiagramTextMeasurer
): { linear: ExcalidrawLinearElement; label: ExcalidrawTextElement | null } {
  const startShape = "id" in spec.start ? shapes.get(spec.start.id) : undefined;
  const endShape = "id" in spec.end ? shapes.get(spec.end.id) : undefined;
  if ("id" in spec.start && !startShape) {
    throw new DiagramSpecError(
      `Arrow ${id} starts at unknown shape "${spec.start.id}"`
    );
  }
  if ("id" in spec.end && !endShape) {
    throw new DiagramSpecError(
      `Arrow ${id} ends at unknown shape "${spec.end.id}"`
    );
  }
  if (startShape && startShape === endShape && !spec.via?.length) {
    // Both ends would snap to the same point: a stray arrowhead on the label.
    throw new DiagramSpecError(
      `Arrow ${id} starts and ends at "${startShape.id}". Add via points to draw a loop around it.`
    );
  }

  const via = (spec.via ?? []) as Point[];
  const rawStart: Point = startShape
    ? shapeCenter(startShape)
    : [(spec.start as { x: number }).x, (spec.start as { y: number }).y];
  const rawEnd: Point = endShape
    ? shapeCenter(endShape)
    : [(spec.end as { x: number }).x, (spec.end as { y: number }).y];
  const start = startShape
    ? boundPoint(startShape, readAnchor(spec.start), via[0] ?? rawEnd)
    : rawStart;
  const end = endShape
    ? boundPoint(endShape, readAnchor(spec.end), via.at(-1) ?? rawStart)
    : rawEnd;
  const absolute: Point[] = [start, ...via, end];

  const [originX, originY] = start;
  const points = absolute.map(
    ([px, py]) => [px - originX, py - originY] as Point
  );
  const xs = points.map(([px]) => px);
  const ys = points.map(([, py]) => py);

  const linear: ExcalidrawLinearElement = {
    ...baseElement(id, spec, {
      x: originX,
      y: originY,
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    }),
    type: spec.type,
    // Sharp elbows unless the user curved the arrow by hand: the layout check
    // and label placement follow straight segments between \`via\` points.
    roundness:
      spec.curved && via.length > 0
        ? { type: EXCALIDRAW_ROUNDNESS_PROPORTIONAL }
        : null,
    points,
    startBinding: startShape
      ? {
          elementId: startShape.id,
          focus: readFocus(spec.start),
          gap: DIAGRAM_BINDING_GAP,
        }
      : null,
    endBinding: endShape
      ? {
          elementId: endShape.id,
          focus: readFocus(spec.end),
          gap: DIAGRAM_BINDING_GAP,
        }
      : null,
    startArrowhead: toArrowhead(spec.startArrowhead, null),
    endArrowhead: toArrowhead(
      spec.endArrowhead,
      spec.type === "arrow" ? "arrow" : null
    ),
    lastCommittedPoint: null,
    elbowed: false,
  };

  for (const shape of [startShape, endShape]) {
    if (shape) {
      shape.boundElements = [
        ...(shape.boundElements ?? []),
        { id, type: "arrow" },
      ];
    }
  }

  if (!spec.label?.text) {
    return { linear, label: null };
  }

  const [midX, midY] = polylineMidpoint(absolute);
  const label = buildTextElement({
    id: `${id}-label`,
    text: spec.label.text,
    fontSize: spec.label.fontSize ?? DIAGRAM_ARROW_LABEL_FONT_SIZE,
    strokeColor: spec.label.strokeColor ?? linear.strokeColor,
    x: midX,
    y: midY,
    textAlign: "center",
    verticalAlign: "middle",
    containerId: id,
    measurer,
    centerOnPoint: true,
  });
  linear.boundElements = [{ id: label.id, type: "text" }];
  return { linear, label };
}

function buildFreeText(
  id: string,
  spec: DiagramTextSpec,
  measurer: DiagramTextMeasurer
): ExcalidrawTextElement {
  const text = buildTextElement({
    id,
    text: spec.text,
    fontSize: spec.fontSize ?? DIAGRAM_DEFAULT_FONT_SIZE,
    strokeColor: spec.strokeColor ?? DIAGRAM_DEFAULT_STROKE,
    x: spec.x,
    y: spec.y,
    textAlign: spec.textAlign ?? "left",
    verticalAlign: "top",
    containerId: null,
    measurer,
  });
  text.angle = spec.angle ?? 0;
  return text;
}

/**
 * Labels are `${containerId}-label`, which can collide with an element the
 * spec named that way. Excalidraw keys elements by id, so rename the label.
 */
function dedupeLabelIds(elements: ExcalidrawElement[]) {
  const taken = new Set<string>();
  for (const element of elements) {
    if (!(element.type === "text" && element.containerId)) {
      taken.add(element.id);
    }
  }
  const byId = new Map(elements.map((element) => [element.id, element]));
  for (const element of elements) {
    if (!(element.type === "text" && element.containerId)) {
      continue;
    }
    if (!taken.has(element.id)) {
      taken.add(element.id);
      continue;
    }
    let id = `${element.id}-text`;
    while (taken.has(id)) {
      id = `${id}-text`;
    }
    const container = byId.get(element.containerId);
    if (container?.boundElements) {
      container.boundElements = container.boundElements.map((bound) =>
        bound.id === element.id ? { ...bound, id } : bound
      );
    }
    element.id = id;
    taken.add(id);
  }
}

/**
 * Expands the compact agent-authored spec into a full Excalidraw scene:
 * label-fitted shapes, edge-snapped arrows with bindings, and bound text.
 */
export function buildExcalidrawScene(
  spec: DiagramSpec,
  measurer: DiagramTextMeasurer
): ExcalidrawScene {
  // Explicit ids first, so a generated `rectangle-0` cannot take an id that
  // an arrow later in the spec points at.
  const usedIds = new Set<string>();
  const explicitIds = spec.elements.map((element) => {
    if (!element.id || usedIds.has(element.id)) {
      return undefined;
    }
    usedIds.add(element.id);
    return element.id;
  });
  const ids = spec.elements.map((element, index) => {
    const explicit = explicitIds[index];
    if (explicit) {
      return explicit;
    }
    let id = element.id ?? `${element.type}-${index}`;
    while (usedIds.has(id)) {
      id = `${id}-${index}`;
    }
    usedIds.add(id);
    return id;
  });

  const shapes = new Map<string, ExcalidrawShapeElement>();
  const shapeLabels = new Map<string, ExcalidrawTextElement>();
  for (const [index, element] of spec.elements.entries()) {
    if (
      element.type === "rectangle" ||
      element.type === "ellipse" ||
      element.type === "diamond"
    ) {
      const id = ids[index] as string;
      const { shape, label } = buildShape(id, element, measurer);
      shapes.set(id, shape);
      if (label) {
        shapeLabels.set(id, label);
      }
    }
  }

  // Excalidraw draws in array order: shapes first so arrows sit on top,
  // and each container's text directly after its container.
  const shapeElements: ExcalidrawElement[] = [];
  const overlayElements: ExcalidrawElement[] = [];
  for (const [index, element] of spec.elements.entries()) {
    const id = ids[index] as string;
    if (element.type === "arrow" || element.type === "line") {
      const { linear, label } = buildLinear(id, element, shapes, measurer);
      overlayElements.push(linear);
      if (label) {
        overlayElements.push(label);
      }
    } else if (element.type === "text") {
      overlayElements.push(buildFreeText(id, element, measurer));
    } else {
      const shape = shapes.get(id);
      if (shape) {
        shapeElements.push(shape);
      }
      const label = shapeLabels.get(id);
      if (label) {
        shapeElements.push(label);
      }
    }
  }

  const elements = [...shapeElements, ...overlayElements];
  dedupeLabelIds(elements);

  return {
    type: "excalidraw",
    version: 2,
    source: EXCALIDRAW_SCENE_SOURCE,
    elements,
    appState: {
      viewBackgroundColor: spec.background ?? DIAGRAM_DEFAULT_BACKGROUND,
      gridSize: null,
    },
    files: {},
  };
}
