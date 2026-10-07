import { describe, expect, test } from "bun:test";

import { diagramSpecSchema } from "../schemas/excalidraw-diagram";
import { parseDiagramSpecText } from "../utils/diagram-edit";
import { sceneToDiagramSpec } from "../utils/diagram-scene-import";
import { buildExcalidrawScene } from "../utils/excalidraw-diagram";
import { findDiagramLayoutIssues } from "../utils/excalidraw-layout-check";

const measurer = {
  measure(text: string, fontSize: number) {
    const lines = text.split("\n");
    return {
      width: Math.max(...lines.map((line) => line.length)) * fontSize * 0.5,
      height: lines.length * fontSize * 1.25,
    };
  },
};

function sceneOf(raw: unknown) {
  return buildExcalidrawScene(diagramSpecSchema.parse(raw), measurer);
}

const flow = {
  background: "#ffffff",
  elements: [
    { type: "text", x: 0, y: 0, text: "Queue flow", fontSize: 40 },
    {
      type: "rectangle",
      id: "event",
      x: 0,
      y: 120,
      width: 200,
      height: 90,
      label: "Event",
      backgroundColor: "#a5d8ff",
    },
    {
      type: "diamond",
      id: "ok",
      x: 400,
      y: 105,
      width: 200,
      height: 120,
      label: "2xx?",
    },
    {
      type: "ellipse",
      id: "done",
      x: 800,
      y: 120,
      width: 200,
      height: 90,
      label: { text: "Done", fontSize: 24 },
      strokeStyle: "dashed",
    },
    {
      type: "arrow",
      id: "send",
      start: { id: "event" },
      end: { id: "ok" },
      label: "send",
    },
    {
      type: "arrow",
      id: "yes",
      start: { id: "ok" },
      end: { id: "done" },
      label: "yes",
    },
    {
      type: "line",
      id: "retry",
      start: { id: "ok" },
      end: { id: "event" },
      via: [
        [500, 330],
        [100, 330],
      ],
    },
  ],
};

describe("sceneToDiagramSpec", () => {
  test("round-trips a generated scene back to an equivalent spec", () => {
    const scene = sceneOf(flow);
    const { spec, droppedTypes } = sceneToDiagramSpec(scene);
    const rebuilt = buildExcalidrawScene(spec, measurer);

    expect(droppedTypes).toEqual([]);
    expect(rebuilt.elements.map((element) => element.id)).toEqual(
      scene.elements.map((element) => element.id)
    );
    for (const [index, element] of rebuilt.elements.entries()) {
      const original = scene.elements[index];
      expect(Math.round(element.x)).toBe(Math.round(original?.x ?? 0));
      expect(Math.round(element.y)).toBe(Math.round(original?.y ?? 0));
      expect(element.backgroundColor).toBe(original?.backgroundColor ?? "");
      expect(element.strokeStyle).toBe(original?.strokeStyle ?? "solid");
    }
  });

  test("keeps the spec compact by leaving out default styles", () => {
    const { spec } = sceneToDiagramSpec(sceneOf(flow));
    const event = spec.elements.find((element) => element.id === "event");
    const done = spec.elements.find((element) => element.id === "done");

    expect(event).toEqual({
      type: "rectangle",
      id: "event",
      x: 0,
      y: 120,
      width: 200,
      height: 90,
      label: { text: "Event" },
      backgroundColor: "#a5d8ff",
    });
    expect(done?.type === "ellipse" && done.label?.fontSize).toBe(24);
  });

  test("reads hand edits: moved shapes, unbound arrows, deleted and freehand elements", () => {
    const scene = sceneOf(flow);
    const edited = {
      ...scene,
      elements: [
        ...scene.elements.map((element) => {
          if (element.id === "done") {
            return { ...element, x: element.x + 40 };
          }
          if (element.id === "yes") {
            return { ...element, endBinding: null };
          }
          if (element.id === "retry") {
            return { ...element, isDeleted: true };
          }
          return element;
        }),
        { id: "scribble", type: "freedraw", x: 0, y: 0, points: [] },
      ],
    };
    const { spec, droppedTypes } = sceneToDiagramSpec(edited);
    const done = spec.elements.find((element) => element.id === "done");
    const yes = spec.elements.find((element) => element.id === "yes");

    expect(droppedTypes).toEqual(["freedraw"]);
    expect(done?.type === "ellipse" && done.x).toBe(840);
    expect(yes?.type === "arrow" && "x" in yes.end).toBe(true);
    expect(spec.elements.some((element) => element.id === "retry")).toBe(false);
  });

  test("keeps rotation and a moved arrow attachment through a save", () => {
    const scene = sceneOf(flow);
    const send = scene.elements.find((element) => element.id === "send");
    if (!(send && "points" in send)) {
      throw new Error("missing arrow");
    }
    // The user rotates the event box and drags the arrow's start to its corner.
    const startPoint: [number, number] = [send.x - 30, send.y + 25];
    const edited = {
      ...scene,
      elements: scene.elements.map((element) => {
        if (element.id === "event" || element.id === "event-label") {
          return { ...element, angle: 0.3 };
        }
        if (element.id === "send") {
          return {
            ...send,
            x: startPoint[0],
            y: startPoint[1],
            points: send.points.map(([px, py], index) =>
              index === 0
                ? ([0, 0] as [number, number])
                : ([
                    px + send.x - startPoint[0],
                    py + send.y - startPoint[1],
                  ] as [number, number])
            ),
            startBinding: { elementId: "event", focus: 0.5, gap: 8 },
          };
        }
        return element;
      }),
    };

    const { spec, droppedTypes } = sceneToDiagramSpec(edited);
    const rebuilt = buildExcalidrawScene(spec, measurer);
    const event = rebuilt.elements.find((element) => element.id === "event");
    const label = rebuilt.elements.find((e) => e.id === "event-label");
    const arrow = rebuilt.elements.find((element) => element.id === "send");

    expect(droppedTypes).toEqual([]);
    expect(event?.angle).toBeCloseTo(0.3, 3);
    expect(label?.angle).toBeCloseTo(0.3, 3);
    expect(arrow?.x).toBeCloseTo(startPoint[0], 0);
    expect(arrow?.y).toBeCloseTo(startPoint[1], 0);
    expect(arrow && "startBinding" in arrow && arrow.startBinding).toEqual({
      elementId: "event",
      focus: 0.5,
      gap: 8,
    });
  });
});

test("keeps an end moved without a focus change and a curved arrow", () => {
  const scene = sceneOf(flow);
  const retry = scene.elements.find((element) => element.id === "retry");
  if (!(retry && "points" in retry)) {
    throw new Error("missing arrow");
  }
  // Elbow arrows bind by fixed point and leave focus at 0, so only the
  // position shows the user moved the end.
  const moved = retry.points.map(([px, py], index) =>
    index === retry.points.length - 1
      ? ([px + 40, py] as [number, number])
      : ([px, py] as [number, number])
  );
  const edited = {
    ...scene,
    elements: scene.elements.map((element) =>
      element.id === "retry"
        ? { ...retry, points: moved, roundness: { type: 2 } }
        : element
    ),
  };

  const { spec } = sceneToDiagramSpec(edited);
  const rebuilt = buildExcalidrawScene(spec, measurer);
  const arrow = rebuilt.elements.find((element) => element.id === "retry");
  const [lastX = 0, lastY = 0] = moved.at(-1) ?? [];

  expect(arrow && "roundness" in arrow && arrow.roundness).not.toBeNull();
  expect(
    arrow && "points" in arrow && arrow.x + (arrow.points.at(-1)?.[0] ?? 0)
  ).toBeCloseTo(retry.x + lastX, 0);
  expect(
    arrow && "points" in arrow && arrow.y + (arrow.points.at(-1)?.[1] ?? 0)
  ).toBeCloseTo(retry.y + lastY, 0);
});

test("saves what the Excalidraw editor allows instead of rejecting it", () => {
  const base = {
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    angle: 0,
  };
  const linePoints = Array.from({ length: 20 }, (_, index) => [
    index * 10,
    index % 2 === 0 ? 0 : 10,
  ]);
  const { spec } = sceneToDiagramSpec({
    elements: [
      {
        ...base,
        id: "a",
        type: "rectangle",
        x: 0,
        y: 0,
        width: 0.4,
        height: 80,
      },
      {
        ...base,
        id: "big",
        type: "text",
        x: 0,
        y: 200,
        text: "Huge",
        originalText: "Huge",
        fontSize: 150,
      },
      {
        ...base,
        id: "wide",
        type: "line",
        x: 0,
        y: 400,
        points: linePoints,
        strokeWidth: 16,
      },
      {
        ...base,
        id: "dot",
        type: "arrow",
        x: 0,
        y: 600,
        points: [
          [0, 0],
          [100, 0],
        ],
        startArrowhead: "circle_outline",
        endArrowhead: "crowfoot_many",
      },
      // Excalidraw stores a rotated line unrotated plus its angle.
      {
        ...base,
        id: "turned",
        type: "line",
        x: 0,
        y: 800,
        points: [
          [0, 0],
          [200, 0],
        ],
        angle: Math.PI / 2,
      },
    ],
  });
  const byId = (id: string) =>
    spec.elements.find((element) => element.id === id);
  const shape = byId("a");
  const big = byId("big");
  const wide = byId("wide");
  const dot = byId("dot");
  const turned = byId("turned");

  expect(shape?.type === "rectangle" && shape.width).toBe(1);
  expect(big?.type === "text" && big.fontSize).toBe(120);
  expect(wide?.type === "line" && wide.via?.length).toBe(12);
  expect(wide?.type === "line" && wide.strokeWidth).toBe(8);
  expect(
    dot?.type === "arrow" && [dot.startArrowhead, dot.endArrowhead]
  ).toEqual(["dot", undefined]);
  expect(turned?.type === "line" && [turned.start, turned.end]).toEqual([
    { x: 100, y: 700 },
    { x: 100, y: 900 },
  ]);
});

describe("findDiagramLayoutIssues", () => {
  test("a tidy diagram has no issues", () => {
    expect(findDiagramLayoutIssues(sceneOf(flow))).toEqual([]);
  });

  test("checks rotated shapes by their rotated outline", () => {
    const quarter = Math.PI / 2;
    // Two wide boxes turned upright: far apart on screen, overlapping unrotated.
    const upright = findDiagramLayoutIssues(
      sceneOf({
        elements: [
          { type: "rectangle", id: "a", x: 0, y: 200, width: 400, height: 80 },
          {
            type: "rectangle",
            id: "b",
            x: 200,
            y: 200,
            width: 400,
            height: 80,
            angle: quarter,
          },
          {
            type: "rectangle",
            id: "c",
            x: 300,
            y: 200,
            width: 400,
            height: 80,
            angle: quarter,
          },
        ],
      })
    );
    // A box tilted by hand is left alone; a tall turned box still counts for size.
    const tilted = findDiagramLayoutIssues(
      sceneOf({
        elements: [
          { type: "rectangle", id: "a", x: 0, y: 0, width: 200, height: 80 },
          {
            type: "rectangle",
            id: "b",
            x: 60,
            y: 20,
            width: 200,
            height: 80,
            angle: 0.3,
          },
          {
            type: "rectangle",
            id: "tall",
            x: 400,
            y: 0,
            width: 900,
            height: 80,
            angle: quarter,
          },
        ],
      })
    );

    // Only a and the upright b really touch; b and c only overlap unrotated.
    expect(upright.filter((issue) => issue.includes("overlap"))).toEqual([
      "Shapes a and b overlap.",
    ]);
    expect(tilted.some((issue) => issue.includes("overlap"))).toBe(false);
    expect(tilted.some((issue) => issue.includes("larger than"))).toBe(true);
  });

  test("flags arrows through unrelated shapes, overlaps, cramped labels, and oversize", () => {
    const issues = findDiagramLayoutIssues(
      sceneOf({
        elements: [
          { type: "rectangle", id: "a", x: 0, y: 0, width: 200, height: 80 },
          {
            type: "rectangle",
            id: "mid",
            x: 400,
            y: 0,
            width: 200,
            height: 80,
          },
          { type: "rectangle", id: "b", x: 800, y: 0, width: 200, height: 80 },
          { type: "rectangle", id: "c", x: 850, y: 40, width: 200, height: 80 },
          {
            type: "rectangle",
            id: "far",
            x: 2000,
            y: 0,
            width: 200,
            height: 80,
          },
          { type: "arrow", start: { id: "a" }, end: { id: "b" } },
          {
            type: "arrow",
            start: { id: "a" },
            end: { id: "mid" },
            label: "a very long arrow label here",
          },
        ],
      })
    );

    expect(issues.some((issue) => issue.includes("runs through shape"))).toBe(
      true
    );
    expect(issues.some((issue) => issue.includes("overlap"))).toBe(true);
    expect(
      issues.some((issue) => issue.includes("covers its whole arrow"))
    ).toBe(true);
    expect(issues.some((issue) => issue.includes("larger than"))).toBe(true);
  });

  test("treats annotations as obstacles for shapes, arrows, and arrow labels", () => {
    const issues = findDiagramLayoutIssues(
      sceneOf({
        elements: [
          { type: "rectangle", id: "a", x: 0, y: 0, width: 200, height: 80 },
          { type: "rectangle", id: "b", x: 0, y: 300, width: 200, height: 80 },
          { type: "text", x: 60, y: 150, text: "annotation on the arrow" },
          { type: "text", x: 150, y: 40, text: "inside a box" },
          { type: "arrow", start: { id: "a" }, end: { id: "b" } },
        ],
      })
    );

    expect(
      issues.some((issue) => issue.includes("runs through the text"))
    ).toBe(true);
    expect(issues.some((issue) => issue.includes("overlaps shape"))).toBe(true);
  });

  test("routing around a shape with via waypoints clears the crossing", () => {
    const base = [
      { type: "rectangle", id: "a", x: 0, y: 0, width: 200, height: 80 },
      { type: "rectangle", id: "mid", x: 400, y: 0, width: 200, height: 80 },
      { type: "rectangle", id: "b", x: 800, y: 0, width: 200, height: 80 },
    ];
    const routed = findDiagramLayoutIssues(
      sceneOf({
        elements: [
          ...base,
          {
            type: "arrow",
            start: { id: "a" },
            end: { id: "b" },
            via: [
              [100, 200],
              [900, 200],
            ],
          },
        ],
      })
    );

    expect(routed.filter((issue) => issue.includes("runs through"))).toEqual(
      []
    );
  });
});

describe("parseDiagramSpecText", () => {
  test("accepts code fences, prose around the JSON, and raw newlines in labels", () => {
    const text =
      'Here is the diagram:\n```json\n{"elements":[{"type":"rectangle","x":0,"y":0,"label":"Cron sweep\nor API"}]}\n```';
    const spec = parseDiagramSpecText(text);
    const [shape] = spec.elements;

    expect(shape?.type === "rectangle" && shape.label?.text).toBe(
      "Cron sweep\nor API"
    );
  });

  test("keeps escaped quotes and backslashes intact", () => {
    const spec = parseDiagramSpecText(
      String.raw`{"elements":[{"type":"text","x":0,"y":0,"text":"say \"hi\" \\ bye"}]}`
    );
    const [text] = spec.elements;

    expect(text?.type === "text" && text.text).toBe('say "hi" \\ bye');
  });
});
