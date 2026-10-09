import { describe, expect, test } from "bun:test";

import { loadFallbackFont } from "@notra/kiwi";
import { Resvg } from "@resvg/resvg-js";

import {
  DIAGRAM_BINDING_GAP,
  DIAGRAM_SHAPE_PADDING,
} from "../constants/excalidraw-diagram";
import { diagramSpecSchema } from "../schemas/excalidraw-diagram";
import type {
  DiagramTextMeasurer,
  ExcalidrawElement,
  ExcalidrawLinearElement,
  ExcalidrawScene,
  ExcalidrawShapeElement,
  ExcalidrawTextElement,
} from "../types/excalidraw-diagram";
import {
  buildExcalidrawScene,
  describeDiagramSpecError,
  isDiagramSpecError,
} from "../utils/excalidraw-diagram";
import { renderExcalidrawSceneToSvg } from "../utils/excalidraw-render";

// Every character is half the font size wide, so expected sizes are easy to derive.
const CHAR_WIDTH_RATIO = 0.5;
const measurer: DiagramTextMeasurer = {
  measure(text, fontSize) {
    const lines = text.split("\n");
    return {
      width:
        Math.max(...lines.map((line) => line.length)) *
        fontSize *
        CHAR_WIDTH_RATIO,
      height: lines.length * fontSize * 1.25,
    };
  },
};

function build(raw: unknown): ExcalidrawScene {
  return buildExcalidrawScene(diagramSpecSchema.parse(raw), measurer);
}

function byId<T extends ExcalidrawElement>(
  scene: ExcalidrawScene,
  id: string
): T {
  const element = scene.elements.find((candidate) => candidate.id === id);
  if (!element) {
    throw new Error(`missing element ${id}`);
  }
  return element as T;
}

describe("buildExcalidrawScene", () => {
  test("grows a shape around its center so the label fits", () => {
    const scene = build({
      elements: [
        {
          type: "rectangle",
          id: "box",
          x: 100,
          y: 100,
          width: 120,
          height: 60,
          label: "A much longer label than fits",
        },
      ],
    });
    const box = byId<ExcalidrawShapeElement>(scene, "box");
    const label = byId<ExcalidrawTextElement>(scene, "box-label");
    const labelWidth = "A much longer label than fits".length * 20 * 0.5;

    expect(box.width).toBe(labelWidth + DIAGRAM_SHAPE_PADDING * 2);
    // The authored center (160, 130) stays put while the box grows.
    expect(box.x + box.width / 2).toBe(160);
    expect(box.y + box.height / 2).toBe(130);
    expect(label.containerId).toBe("box");
    expect(label.x + label.width / 2).toBe(160);
    expect(box.boundElements).toEqual([{ id: "box-label", type: "text" }]);
  });

  test("snaps a bound arrow to both shape edges with the binding gap", () => {
    const scene = build({
      elements: [
        { type: "rectangle", id: "a", x: 0, y: 0, width: 200, height: 80 },
        { type: "rectangle", id: "b", x: 400, y: 0, width: 200, height: 80 },
        { type: "arrow", id: "ab", start: { id: "a" }, end: { id: "b" } },
      ],
    });
    const arrow = byId<ExcalidrawLinearElement>(scene, "ab");
    const [, end] = arrow.points;

    expect(arrow.x).toBe(200 + DIAGRAM_BINDING_GAP);
    expect(arrow.y).toBe(40);
    expect(arrow.x + (end?.[0] ?? 0)).toBe(400 - DIAGRAM_BINDING_GAP);
    expect(arrow.startBinding?.elementId).toBe("a");
    expect(arrow.endBinding?.elementId).toBe("b");
    expect(arrow.endArrowhead).toBe("arrow");
    expect(arrow.startArrowhead).toBeNull();
    expect(byId<ExcalidrawShapeElement>(scene, "a").boundElements).toEqual([
      { id: "ab", type: "arrow" },
    ]);
  });

  test("ends arrows on the curve of ellipses and diamonds, not their box", () => {
    const scene = build({
      elements: [
        { type: "ellipse", id: "e", x: 0, y: 0, width: 200, height: 100 },
        { type: "diamond", id: "d", x: 300, y: 200, width: 200, height: 100 },
        { type: "arrow", id: "ed", start: { id: "e" }, end: { id: "d" } },
      ],
    });
    const arrow = byId<ExcalidrawLinearElement>(scene, "ed");
    const start: [number, number] = [arrow.x, arrow.y];
    const last = arrow.points.at(-1) ?? [0, 0];
    const end: [number, number] = [arrow.x + last[0], arrow.y + last[1]];

    // Pull each endpoint back by the gap; the result must sit on the outline.
    const direction = [end[0] - start[0], end[1] - start[1]];
    const length = Math.hypot(direction[0] ?? 0, direction[1] ?? 0);
    const unit = [(direction[0] ?? 0) / length, (direction[1] ?? 0) / length];
    const onEllipse = [
      start[0] - (unit[0] ?? 0) * DIAGRAM_BINDING_GAP,
      start[1] - (unit[1] ?? 0) * DIAGRAM_BINDING_GAP,
    ];
    const onDiamond = [
      end[0] + (unit[0] ?? 0) * DIAGRAM_BINDING_GAP,
      end[1] + (unit[1] ?? 0) * DIAGRAM_BINDING_GAP,
    ];

    expect(
      ((onEllipse[0] ?? 0) - 100) ** 2 / 100 ** 2 +
        ((onEllipse[1] ?? 0) - 50) ** 2 / 50 ** 2
    ).toBeCloseTo(1, 1);
    expect(
      Math.abs((onDiamond[0] ?? 0) - 400) / 100 +
        Math.abs((onDiamond[1] ?? 0) - 250) / 50
    ).toBeCloseTo(1, 1);
  });

  test("routes through via waypoints and labels the arrow at its midpoint", () => {
    const scene = build({
      elements: [
        { type: "rectangle", id: "a", x: 0, y: 0, width: 160, height: 60 },
        { type: "rectangle", id: "b", x: 0, y: 300, width: 160, height: 60 },
        {
          type: "arrow",
          id: "loop",
          start: { id: "a" },
          end: { id: "b" },
          via: [
            [300, 30],
            [300, 330],
          ],
          label: "retry",
        },
      ],
    });
    const arrow = byId<ExcalidrawLinearElement>(scene, "loop");
    const label = byId<ExcalidrawTextElement>(scene, "loop-label");

    expect(arrow.points).toHaveLength(4);
    expect(arrow.roundness).toBeNull();
    // Leaves a's right edge toward the first waypoint, not toward b's center.
    expect(arrow.x).toBe(160 + DIAGRAM_BINDING_GAP);
    expect(label.containerId).toBe("loop");
    expect(label.x + label.width / 2).toBeCloseTo(300, 5);
  });

  test("draws shapes and their labels before arrows and free text", () => {
    const scene = build({
      elements: [
        { type: "text", x: 0, y: -80, text: "Title", fontSize: 36 },
        { type: "rectangle", id: "a", x: 0, y: 0, label: "A" },
        { type: "arrow", start: { id: "a" }, end: { x: 400, y: 30 } },
        { type: "rectangle", id: "b", x: 500, y: 0, label: "B" },
      ],
    });

    expect(scene.elements.map((element) => element.type)).toEqual([
      "rectangle",
      "text",
      "rectangle",
      "text",
      "text",
      "arrow",
    ]);
    const freeArrow = scene.elements.find(
      (element): element is ExcalidrawLinearElement => element.type === "arrow"
    );
    expect(freeArrow?.endBinding).toBeNull();
  });

  test("keeps ids unique and seeds stable across rebuilds", () => {
    const raw = {
      elements: [
        { type: "rectangle", id: "dup", x: 0, y: 0 },
        { type: "rectangle", id: "dup", x: 300, y: 0 },
      ],
    };
    const first = build(raw);
    const second = build(raw);
    const ids = first.elements.map((element) => element.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(first.elements.map((element) => element.seed)).toEqual(
      second.elements.map((element) => element.seed)
    );
  });

  test("maps arrowhead none to null and lines default to no arrowheads", () => {
    const scene = build({
      elements: [
        { type: "rectangle", id: "a", x: 0, y: 0 },
        { type: "rectangle", id: "b", x: 400, y: 0 },
        {
          type: "arrow",
          id: "plain",
          start: { id: "a" },
          end: { id: "b" },
          endArrowhead: "none",
          startArrowhead: "dot",
        },
        { type: "line", id: "edge", start: { id: "a" }, end: { id: "b" } },
      ],
    });
    const arrow = byId<ExcalidrawLinearElement>(scene, "plain");
    const line = byId<ExcalidrawLinearElement>(scene, "edge");

    expect(arrow.endArrowhead).toBeNull();
    expect(arrow.startArrowhead).toBe("dot");
    expect(line.endArrowhead).toBeNull();
  });
});

test("keeps ids unique: explicit ids win and labels never collide", () => {
  const scene = build({
    elements: [
      { type: "rectangle", x: 0, y: 0, label: "anon" },
      { type: "rectangle", id: "rectangle-0", x: 400, y: 0, label: "named" },
      { type: "text", id: "rectangle-0-label", x: 0, y: 300, text: "note" },
      { type: "arrow", start: { x: 200, y: 400 }, end: { id: "rectangle-0" } },
    ],
  });
  const ids = scene.elements.map((element) => element.id);
  const arrow = scene.elements.find((element) => element.type === "arrow");
  const named = byId<ExcalidrawShapeElement>(scene, "rectangle-0");
  const namedLabel = scene.elements.find(
    (element) => element.type === "text" && element.containerId === named.id
  );

  expect(new Set(ids).size).toBe(ids.length);
  expect(named.x).toBe(400);
  expect(arrow && "endBinding" in arrow && arrow.endBinding?.elementId).toBe(
    "rectangle-0"
  );
  expect(named.boundElements?.map((bound) => bound.id)).toContain(
    namedLabel?.id ?? ""
  );
});

describe("diagram spec errors", () => {
  test("an arrow from a shape to itself needs via points", () => {
    expect(() =>
      build({
        elements: [
          { type: "rectangle", id: "a", x: 0, y: 0, label: "A" },
          { type: "arrow", start: { id: "a" }, end: { id: "a" } },
        ],
      })
    ).toThrow("Add via points");
  });

  test("an arrow to an unknown shape is a spec error the agent can fix", () => {
    let caught: unknown;
    try {
      build({
        elements: [
          { type: "rectangle", id: "a", x: 0, y: 0 },
          { type: "arrow", id: "x", start: { id: "a" }, end: { id: "ghost" } },
        ],
      });
    } catch (error) {
      caught = error;
    }

    expect(isDiagramSpecError(caught)).toBe(true);
    expect(describeDiagramSpecError(caught)).toContain('"ghost"');
  });

  test("schema and JSON failures are spec errors, infrastructure errors are not", () => {
    const schemaResult = diagramSpecSchema.safeParse({
      elements: [{ type: "hexagon", x: 0, y: 0 }],
    });
    let syntaxError: unknown;
    try {
      JSON.parse("{ not json");
    } catch (error) {
      syntaxError = error;
    }

    expect(schemaResult.success).toBe(false);
    expect(isDiagramSpecError(schemaResult.error)).toBe(true);
    expect(describeDiagramSpecError(schemaResult.error)).toContain("type");
    expect(isDiagramSpecError(syntaxError)).toBe(true);
    expect(isDiagramSpecError(new Error("font fetch failed"))).toBe(false);
  });

  test("accepts string and object labels", () => {
    const parsed = diagramSpecSchema.parse({
      elements: [
        { type: "rectangle", x: 0, y: 0, label: "Plain" },
        {
          type: "rectangle",
          x: 200,
          y: 0,
          label: { text: "Styled", fontSize: 28 },
        },
      ],
    });
    const [plain, styled] = parsed.elements;

    expect(plain?.type === "rectangle" && plain.label).toEqual({
      text: "Plain",
    });
    expect(styled?.type === "rectangle" && styled.label?.fontSize).toBe(28);
  });
});

describe("renderExcalidrawSceneToSvg", () => {
  test("renders a 1200x630 SVG with text as paths that resvg can rasterize", async () => {
    const font = await loadFallbackFont();
    const scene = buildExcalidrawScene(
      diagramSpecSchema.parse({
        background: "#fafafa",
        elements: [
          { type: "text", x: 0, y: -80, text: "Queue flow", fontSize: 36 },
          { type: "rectangle", id: "a", x: 0, y: 0, label: "Event" },
          { type: "ellipse", id: "b", x: 400, y: 0, label: "Done" },
          {
            type: "arrow",
            start: { id: "a" },
            end: { id: "b" },
            label: "send",
            strokeStyle: "dashed",
          },
        ],
      }),
      measurer
    );
    const svg = renderExcalidrawSceneToSvg(scene, font);
    const png = new Resvg(svg).render();

    expect(svg).toStartWith("<svg");
    expect(svg).not.toContain("NaN");
    expect(svg).not.toContain("<text");
    expect(svg).toContain('fill="#fafafa"');
    expect(svg).toContain("stroke-dasharray");
    expect(png.width).toBe(1200);
    expect(png.height).toBe(630);
  });
});
