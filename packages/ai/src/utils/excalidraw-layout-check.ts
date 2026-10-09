import {
  DIAGRAM_CANVAS_PADDING,
  DIAGRAM_LAYOUT_TOLERANCE,
} from "@notra/ai/constants/excalidraw-diagram";
import {
  REPO_IMAGE_HEIGHT,
  REPO_IMAGE_WIDTH,
} from "@notra/ai/constants/repo-image";
import type {
  ExcalidrawElement,
  ExcalidrawLinearElement,
  ExcalidrawScene,
  ExcalidrawShapeElement,
  ExcalidrawTextElement,
} from "@notra/ai/types/excalidraw-diagram";
import { rotatedBox } from "@notra/ai/utils/excalidraw-diagram";

type Point = [number, number];
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_READABLE_SCALE = 0.9;
const QUARTER_TURN_TOLERANCE = 0.001;
const LABEL_CLEARANCE = 24;

function isShape(
  element: ExcalidrawElement
): element is ExcalidrawShapeElement {
  return (
    element.type === "rectangle" ||
    element.type === "ellipse" ||
    element.type === "diamond"
  );
}

function isLinear(
  element: ExcalidrawElement
): element is ExcalidrawLinearElement {
  return element.type === "arrow" || element.type === "line";
}

function isQuarterTurn(angle: number) {
  return Math.abs(Math.sin(angle * 2)) < QUARTER_TURN_TOLERANCE;
}

function shrink(box: Box, by: number): Box {
  return {
    x: box.x + by,
    y: box.y + by,
    width: Math.max(0, box.width - by * 2),
    height: Math.max(0, box.height - by * 2),
  };
}

function boxesOverlap(a: Box, b: Box) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

// Liang-Barsky clip: does the segment pass through the box interior?
function segmentHitsBox([x1, y1]: Point, [x2, y2]: Point, box: Box) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, x1 - box.x],
    [dx, box.x + box.width - x1],
    [-dy, y1 - box.y],
    [dy, box.y + box.height - y1],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) {
        return false;
      }
      continue;
    }
    const t = q / p;
    if (p < 0) {
      t0 = Math.max(t0, t);
    } else {
      t1 = Math.min(t1, t);
    }
    if (t0 > t1) {
      return false;
    }
  }
  return true;
}

function describe(element: ExcalidrawElement, labels: Map<string, string>) {
  const label = labels.get(element.id);
  return label
    ? `"${label.replaceAll("\n", " ")}" (${element.id})`
    : element.id;
}

/**
 * Finds layout problems a reader would notice in the rendered image. Used to
 * give fast diagram edits the same feedback the sandbox check script gives.
 */
export function findDiagramLayoutIssues(scene: ExcalidrawScene): string[] {
  const issues: string[] = [];
  // A quarter-turned element is checked by its rotated box, which is exact.
  // Other angles and curved arrows only come from hand edits; leave them out
  // of the overlap and crossing checks rather than flag problems that the
  // straight-segment geometry here cannot see correctly.
  const checked = scene.elements.flatMap((element): ExcalidrawElement[] => {
    if (isLinear(element)) {
      return element.roundness ? [] : [element];
    }
    if (element.angle === 0) {
      return [element];
    }
    return isQuarterTurn(element.angle)
      ? [{ ...element, ...rotatedBox(element) }]
      : [];
  });
  const shapes = checked.filter(isShape);
  const linears = checked.filter(isLinear);
  const texts = checked.filter(
    (element): element is ExcalidrawTextElement => element.type === "text"
  );
  const labelElements = new Map(
    texts
      .filter((text) => text.containerId)
      .map((text) => [text.containerId as string, text])
  );
  const labels = new Map(
    [...labelElements].map(([id, text]) => [id, text.text])
  );

  for (const [index, a] of shapes.entries()) {
    for (const b of shapes.slice(index + 1)) {
      if (boxesOverlap(a, b)) {
        issues.push(
          `Shapes ${describe(a, labels)} and ${describe(b, labels)} overlap.`
        );
      }
    }
  }

  // Free text (titles, annotations) and arrow labels are obstacles too: cheap
  // models like to drop a new arrow label right on top of an annotation.
  const linearIds = new Set(linears.map((linear) => linear.id));
  const freeTexts = texts.filter((text) => text.containerId === null);
  const arrowLabels = texts.filter(
    (text) => text.containerId !== null && linearIds.has(text.containerId)
  );
  const quote = (text: ExcalidrawTextElement) =>
    `"${text.text.replaceAll("\n", " ")}"`;
  for (const text of freeTexts) {
    const inner = shrink(text, DIAGRAM_LAYOUT_TOLERANCE / 2);
    for (const shape of shapes) {
      if (boxesOverlap(inner, shape)) {
        issues.push(
          `Text ${quote(text)} overlaps shape ${describe(shape, labels)}.`
        );
      }
    }
  }
  for (const [index, a] of [...freeTexts, ...arrowLabels].entries()) {
    for (const b of [...freeTexts, ...arrowLabels].slice(index + 1)) {
      if (boxesOverlap(shrink(a, 2), shrink(b, 2))) {
        issues.push(`Text ${quote(a)} and text ${quote(b)} overlap.`);
      }
    }
  }
  for (const label of arrowLabels) {
    for (const shape of shapes) {
      if (boxesOverlap(shrink(label, 2), shape)) {
        issues.push(
          `Arrow label ${quote(label)} overlaps shape ${describe(shape, labels)}. Move the shapes apart or shorten the label.`
        );
      }
    }
  }

  for (const linear of linears) {
    const points = linear.points.map(
      ([px, py]) => [linear.x + px, linear.y + py] as Point
    );
    const ends = new Set([
      linear.startBinding?.elementId,
      linear.endBinding?.elementId,
    ]);
    for (const shape of shapes) {
      if (ends.has(shape.id)) {
        continue;
      }
      const inner = shrink(shape, DIAGRAM_LAYOUT_TOLERANCE);
      const crosses = points
        .slice(1)
        .some((point, index) =>
          segmentHitsBox(points[index] as Point, point, inner)
        );
      if (crosses) {
        issues.push(
          `Arrow ${describe(linear, labels)} from ${linear.startBinding?.elementId ?? "a free point"} to ${linear.endBinding?.elementId ?? "a free point"} runs through shape ${describe(shape, labels)}. Move a shape or route the arrow with via waypoints.`
        );
      }
    }
    for (const text of freeTexts) {
      const inner = shrink(text, 2);
      const crosses = points
        .slice(1)
        .some((point, index) =>
          segmentHitsBox(points[index] as Point, point, inner)
        );
      if (crosses) {
        issues.push(
          `Arrow ${describe(linear, labels)} runs through the text ${quote(text)}. Move the text or the arrow.`
        );
      }
    }

    const label = labelElements.get(linear.id);
    if (label) {
      const length = points
        .slice(1)
        .reduce(
          (sum, point, index) =>
            sum +
            Math.hypot(
              point[0] - (points[index]?.[0] ?? 0),
              point[1] - (points[index]?.[1] ?? 0)
            ),
          0
        );
      const horizontal =
        Math.abs((points.at(-1)?.[0] ?? 0) - (points[0]?.[0] ?? 0)) >=
        Math.abs((points.at(-1)?.[1] ?? 0) - (points[0]?.[1] ?? 0));
      const needed =
        (horizontal ? label.width : label.height) + LABEL_CLEARANCE;
      if (length < needed) {
        issues.push(
          `Arrow label "${label.text}" covers its whole arrow (${Math.round(length)}px long, needs ~${Math.round(needed)}px). Widen the gap between the shapes or shorten the label.`
        );
      }
    }
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const element of scene.elements) {
    let points: number[][];
    if (isLinear(element)) {
      points = element.points.map(([px, py]) => [
        element.x + px,
        element.y + py,
      ]);
    } else {
      const box = rotatedBox(element);
      points = [
        [box.x, box.y],
        [box.x + box.width, box.y + box.height],
      ];
    }
    for (const [px = 0, py = 0] of points) {
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
  }
  const scale = Math.min(
    (REPO_IMAGE_WIDTH - DIAGRAM_CANVAS_PADDING * 2) / (maxX - minX),
    (REPO_IMAGE_HEIGHT - DIAGRAM_CANVAS_PADDING * 2) / (maxY - minY)
  );
  if (scale < MIN_READABLE_SCALE) {
    issues.push(
      `The diagram is ${Math.round(maxX - minX)}x${Math.round(maxY - minY)}px, larger than the 1100x530 box, so text renders at ${Math.round(scale * 100)}% size. Tighten the layout.`
    );
  }

  return issues;
}
