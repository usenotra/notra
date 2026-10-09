import {
  DIAGRAM_ANGLE_TOLERANCE,
  DIAGRAM_ARROW_LABEL_FONT_SIZE,
  DIAGRAM_ARROWHEAD_FALLBACKS,
  DIAGRAM_ATTACHMENT_TOLERANCE,
  DIAGRAM_DEFAULT_FONT_SIZE,
  DIAGRAM_DEFAULT_ROUGHNESS,
  DIAGRAM_DEFAULT_STROKE,
  DIAGRAM_DEFAULT_STROKE_WIDTH,
  DIAGRAM_MAX_COORDINATE,
  DIAGRAM_MAX_ELEMENTS,
  DIAGRAM_MAX_FONT_SIZE,
  DIAGRAM_MAX_LABEL_FONT_SIZE,
  DIAGRAM_MAX_SHAPE_SIZE,
  DIAGRAM_MAX_STROKE_WIDTH,
  DIAGRAM_MAX_TEXT_LENGTH,
  DIAGRAM_MAX_VIA_POINTS,
  DIAGRAM_SHAPE_TYPES,
} from "@notra/ai/constants/excalidraw-diagram";
import { diagramSpecSchema } from "@notra/ai/schemas/excalidraw-diagram";
import type {
  DiagramShapeGeometry,
  DiagramSpec,
} from "@notra/ai/types/excalidraw-diagram";
import {
  boundPoint,
  DiagramSpecError,
  shapeCenter,
} from "@notra/ai/utils/excalidraw-diagram";
import {
  isRecord,
  readNumber,
  readString,
  type UnknownRecord,
} from "@notra/ai/utils/unknown-record";

// Turns a scene edited by hand in Excalidraw back into the compact spec.

function isShapeType(
  type: string | undefined
): type is (typeof DIAGRAM_SHAPE_TYPES)[number] {
  return DIAGRAM_SHAPE_TYPES.some((shapeType) => shapeType === type);
}

// Values the spec would fall back to anyway. Leaving them out keeps the spec
// close to what an agent writes and cheap to send back to the model.
const STYLE_DEFAULTS: Record<string, string | number> = {
  strokeColor: DIAGRAM_DEFAULT_STROKE,
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: DIAGRAM_DEFAULT_STROKE_WIDTH,
  strokeStyle: "solid",
  roughness: DIAGRAM_DEFAULT_ROUGHNESS,
  opacity: 100,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function coordinate(value: number) {
  return Math.round(
    clamp(value, -DIAGRAM_MAX_COORDINATE, DIAGRAM_MAX_COORDINATE)
  );
}

function size(value: number | undefined) {
  return value === undefined
    ? undefined
    : clamp(Math.round(value), 1, DIAGRAM_MAX_SHAPE_SIZE);
}

function fontSize(value: number | undefined, max: number) {
  return value === undefined || value <= 0 ? undefined : Math.min(value, max);
}

function clipText(value: string) {
  return value.slice(0, DIAGRAM_MAX_TEXT_LENGTH);
}

/** Keeps the first and last waypoint and evenly spaced ones in between. */
function limitVia(points: [number, number][]) {
  if (points.length <= DIAGRAM_MAX_VIA_POINTS) {
    return points;
  }
  const step = (points.length - 1) / (DIAGRAM_MAX_VIA_POINTS - 1);
  return Array.from(
    { length: DIAGRAM_MAX_VIA_POINTS },
    (_, index) => points[Math.round(index * step)] as [number, number]
  );
}

// Excalidraw offers more arrowheads than the spec; draw the closest one.
function readArrowhead(element: UnknownRecord, key: string) {
  const value = element[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  return DIAGRAM_ARROWHEAD_FALLBACKS[value] ?? value;
}

function readStyle(element: UnknownRecord) {
  const style: Record<string, string | number> = {};
  for (const [key, fallback] of Object.entries(STYLE_DEFAULTS)) {
    const value = element[key];
    if (
      (typeof value === "string" || typeof value === "number") &&
      value !== fallback
    ) {
      style[key] =
        key === "strokeWidth" && typeof value === "number"
          ? clamp(value, 0.5, DIAGRAM_MAX_STROKE_WIDTH)
          : value;
    }
  }
  return style;
}

function readAngle(element: UnknownRecord) {
  const angle = readNumber(element, "angle") ?? 0;
  return Math.abs(angle) > DIAGRAM_ANGLE_TOLERANCE
    ? Math.round(angle * 1000) / 1000
    : undefined;
}

function shapeGeometry(shape: UnknownRecord): DiagramShapeGeometry | undefined {
  const type = readString(shape, "type");
  const width = readNumber(shape, "width") ?? 0;
  const height = readNumber(shape, "height") ?? 0;
  if (!(isShapeType(type) && width && height)) {
    return undefined;
  }
  return {
    type,
    x: readNumber(shape, "x") ?? 0,
    y: readNumber(shape, "y") ?? 0,
    width,
    height,
    angle: readNumber(shape, "angle") ?? 0,
  };
}

/**
 * A bound arrow end as a spec endpoint. An end where Notra would snap it
 * anyway (the edge facing `toward`) stays a plain id; one the user moved
 * elsewhere keeps its position as a fraction of the shape's unrotated box,
 * plus Excalidraw's focus so the editor keeps it when the shape moves.
 */
function boundEndpoint(
  element: UnknownRecord,
  key: "startBinding" | "endBinding",
  point: [number, number],
  toward: [number, number],
  shapes: Map<string, UnknownRecord>
) {
  const binding = element[key];
  const shapeId = isRecord(binding)
    ? readString(binding, "elementId")
    : undefined;
  const shapeRecord = shapeId ? shapes.get(shapeId) : undefined;
  const shape = shapeRecord ? shapeGeometry(shapeRecord) : undefined;
  if (!(shapeId && shape && isRecord(binding))) {
    return undefined;
  }
  const [snapX, snapY] = boundPoint(shape, undefined, toward);
  if (
    Math.hypot(point[0] - snapX, point[1] - snapY) <=
    DIAGRAM_ATTACHMENT_TOLERANCE
  ) {
    return { id: shapeId };
  }
  // Undo the shape's rotation so the anchor is in its own frame.
  const [cx, cy] = shapeCenter(shape);
  const cos = Math.cos(-shape.angle);
  const sin = Math.sin(-shape.angle);
  const dx = point[0] - cx;
  const dy = point[1] - cy;
  const localX = cx + dx * cos - dy * sin;
  const localY = cy + dx * sin + dy * cos;
  const fraction = (value: number) =>
    Math.min(2, Math.max(-1, Math.round(value * 1000) / 1000));
  const focus = readNumber(binding, "focus") ?? 0;
  return {
    id: shapeId,
    anchor: [
      fraction((localX - shape.x) / shape.width),
      fraction((localY - shape.y) / shape.height),
    ],
    focus: Math.min(1, Math.max(-1, Math.round(focus * 1000) / 1000)),
  };
}

/**
 * Converts an Excalidraw scene edited by hand back into the compact spec, so
 * later AI edits start from what the user drew. Freedraw, images, and frames
 * have no spec equivalent and are reported as dropped.
 */
export function sceneToDiagramSpec(scene: unknown): {
  spec: DiagramSpec;
  droppedTypes: string[];
} {
  const sceneRecord = isRecord(scene) ? scene : {};
  const rawElements = Array.isArray(sceneRecord.elements)
    ? sceneRecord.elements.filter(isRecord)
    : [];
  const elements = rawElements.filter((element) => element.isDeleted !== true);
  const appState = isRecord(sceneRecord.appState) ? sceneRecord.appState : {};

  const labels = new Map<string, UnknownRecord>();
  for (const element of elements) {
    const containerId = readString(element, "containerId");
    if (element.type === "text" && containerId) {
      labels.set(containerId, element);
    }
  }
  const elementsById = new Map<string, UnknownRecord>();
  for (const element of elements) {
    const id = readString(element, "id");
    if (id) {
      elementsById.set(id, element);
    }
  }
  const labelFor = (id: string | undefined) => {
    const label = id ? labels.get(id) : undefined;
    // `text` holds the lines as Excalidraw wrapped them to the container's
    // width; `originalText` would come back as one line and widen the shape.
    const text = label
      ? (readString(label, "text") ?? readString(label, "originalText"))
      : undefined;
    if (!(label && text?.trim())) {
      return undefined;
    }
    const container = id ? elementsById.get(id) : undefined;
    const containerType = container ? readString(container, "type") : undefined;
    const defaultSize =
      containerType === "arrow" || containerType === "line"
        ? DIAGRAM_ARROW_LABEL_FONT_SIZE
        : DIAGRAM_DEFAULT_FONT_SIZE;
    const labelSize = fontSize(
      readNumber(label, "fontSize"),
      DIAGRAM_MAX_LABEL_FONT_SIZE
    );
    const strokeColor = readString(label, "strokeColor");
    const containerStroke = container
      ? readString(container, "strokeColor")
      : undefined;
    if (
      (labelSize === undefined || labelSize === defaultSize) &&
      (!strokeColor || strokeColor === containerStroke)
    ) {
      return clipText(text);
    }
    return {
      text: clipText(text),
      fontSize: labelSize,
      strokeColor: strokeColor === containerStroke ? undefined : strokeColor,
    };
  };

  const shapes = new Map<string, UnknownRecord>();
  for (const element of elements) {
    const id = readString(element, "id");
    if (id && isShapeType(readString(element, "type"))) {
      shapes.set(id, element);
    }
  }
  const droppedTypes = new Set<string>();
  const specElements: unknown[] = [];

  for (const element of elements) {
    const type = readString(element, "type");
    const id = readString(element, "id");
    const x = readNumber(element, "x") ?? 0;
    const y = readNumber(element, "y") ?? 0;

    if (isShapeType(type)) {
      const rounded =
        element.roundness !== null && element.roundness !== undefined;
      specElements.push({
        type,
        id,
        x: coordinate(x),
        y: coordinate(y),
        width: size(readNumber(element, "width")),
        height: size(readNumber(element, "height")),
        // Rectangles default to rounded corners; other shapes to sharp ones.
        rounded: rounded === (type === "rectangle") ? undefined : rounded,
        angle: readAngle(element),
        label: labelFor(id),
        ...readStyle(element),
      });
    } else if (type === "text") {
      if (readString(element, "containerId")) {
        continue;
      }
      const textAlign = readString(element, "textAlign");
      // A fixed-width text box keeps the line breaks Excalidraw wrapped it to.
      const text =
        element.autoResize === false
          ? (readString(element, "text") ?? readString(element, "originalText"))
          : (readString(element, "originalText") ??
            readString(element, "text"));
      if (!text?.trim()) {
        continue;
      }
      specElements.push({
        type,
        id,
        x: coordinate(x),
        y: coordinate(y),
        text: clipText(text),
        fontSize: fontSize(
          readNumber(element, "fontSize"),
          DIAGRAM_MAX_FONT_SIZE
        ),
        textAlign: textAlign === "left" ? undefined : textAlign,
        angle: readAngle(element),
        ...readStyle(element),
      });
    } else if (type === "arrow" || type === "line") {
      const points = Array.isArray(element.points)
        ? element.points.filter(
            (point): point is [number, number] =>
              Array.isArray(point) &&
              typeof point[0] === "number" &&
              typeof point[1] === "number"
          )
        : [];
      // A rotated line stores unrotated points plus an angle around the
      // center of its points' box.
      const angle = readNumber(element, "angle") ?? 0;
      const xs = points.map(([px]) => px);
      const ys = points.map(([, py]) => py);
      const cx = x + (Math.min(...xs, 0) + Math.max(...xs, 0)) / 2;
      const cy = y + (Math.min(...ys, 0) + Math.max(...ys, 0)) / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const absolute = points.map(([px, py]) => {
        const dx = x + px - cx;
        const dy = y + py - cy;
        return [
          coordinate(cx + dx * cos - dy * sin),
          coordinate(cy + dx * sin + dy * cos),
        ] as [number, number];
      });
      const first = absolute[0] ?? [x, y];
      const last = absolute.at(-1) ?? first;
      // Mirror the scene builder: a bound end faces the next point, or the
      // other end's shape center when there are no waypoints.
      const boundCenter = (key: "startBinding" | "endBinding") => {
        const binding = element[key];
        const shapeId = isRecord(binding)
          ? readString(binding, "elementId")
          : undefined;
        const shape = shapeId ? shapes.get(shapeId) : undefined;
        const geometry = shape ? shapeGeometry(shape) : undefined;
        return geometry ? shapeCenter(geometry) : undefined;
      };
      const hasVia = absolute.length > 2;
      const startToward =
        (hasVia ? absolute[1] : undefined) ?? boundCenter("endBinding") ?? last;
      const endToward =
        (hasVia ? absolute.at(-2) : undefined) ??
        boundCenter("startBinding") ??
        first;
      const defaultEnd = type === "arrow" ? "arrow" : null;
      const arrowhead = (key: string, fallback: string | null) => {
        const value = readArrowhead(element, key);
        if (value === fallback) {
          return undefined;
        }
        return value === null ? "none" : value;
      };
      specElements.push({
        type,
        id,
        start: boundEndpoint(
          element,
          "startBinding",
          first,
          startToward,
          shapes
        ) ?? {
          x: first[0],
          y: first[1],
        },
        end: boundEndpoint(element, "endBinding", last, endToward, shapes) ?? {
          x: last[0],
          y: last[1],
        },
        via: hasVia ? limitVia(absolute.slice(1, -1)) : undefined,
        curved:
          hasVia &&
          element.roundness !== null &&
          element.roundness !== undefined
            ? true
            : undefined,
        label: labelFor(id),
        startArrowhead: arrowhead("startArrowhead", null),
        endArrowhead: arrowhead("endArrowhead", defaultEnd),
        ...readStyle(element),
      });
    } else if (type) {
      droppedTypes.add(type);
    }
  }

  if (specElements.length > DIAGRAM_MAX_ELEMENTS) {
    throw new DiagramSpecError(
      `The diagram has ${specElements.length} elements; Notra supports up to ${DIAGRAM_MAX_ELEMENTS}. Remove some before saving.`
    );
  }
  const spec = diagramSpecSchema.parse({
    background: readString(appState, "viewBackgroundColor"),
    elements: specElements,
  });
  return { spec, droppedTypes: [...droppedTypes] };
}
