import type {
  diagramElementSchema,
  diagramSpecSchema,
} from "@notra/ai/schemas/excalidraw-diagram";
import type * as z from "zod";

export type DiagramSpec = z.infer<typeof diagramSpecSchema>;
export type DiagramSpecElement = z.infer<typeof diagramElementSchema>;
export type DiagramShapeSpec = Extract<
  DiagramSpecElement,
  { type: "rectangle" | "ellipse" | "diamond" }
>;
export type DiagramTextSpec = Extract<DiagramSpecElement, { type: "text" }>;
export type DiagramLinearSpec = Extract<
  DiagramSpecElement,
  { type: "arrow" | "line" }
>;

/** What edge-snapping needs to know about a shape. */
export type DiagramShapeGeometry = Pick<
  ExcalidrawShapeElement,
  "type" | "x" | "y" | "width" | "height" | "angle"
>;

export type ExcalidrawArrowhead = "arrow" | "triangle" | "dot" | "bar" | null;

export interface ExcalidrawBinding {
  elementId: string;
  focus: number;
  gap: number;
}

export interface ExcalidrawElementBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: "solid" | "hachure" | "cross-hatch" | "zigzag";
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  roughness: number;
  opacity: number;
  groupIds: string[];
  frameId: null;
  index: null;
  roundness: { type: number } | null;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: false;
  boundElements: { id: string; type: "text" | "arrow" }[] | null;
  updated: number;
  link: null;
  locked: false;
}

export interface ExcalidrawShapeElement extends ExcalidrawElementBase {
  type: "rectangle" | "ellipse" | "diamond";
}

export interface ExcalidrawTextElement extends ExcalidrawElementBase {
  type: "text";
  text: string;
  originalText: string;
  fontSize: number;
  fontFamily: number;
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "middle";
  containerId: string | null;
  lineHeight: number;
  autoResize: boolean;
}

export interface ExcalidrawLinearElement extends ExcalidrawElementBase {
  type: "arrow" | "line";
  points: [number, number][];
  startBinding: ExcalidrawBinding | null;
  endBinding: ExcalidrawBinding | null;
  startArrowhead: ExcalidrawArrowhead;
  endArrowhead: ExcalidrawArrowhead;
  lastCommittedPoint: null;
  elbowed: false;
}

export type ExcalidrawElement =
  | ExcalidrawShapeElement
  | ExcalidrawTextElement
  | ExcalidrawLinearElement;

export interface ExcalidrawScene {
  type: "excalidraw";
  version: 2;
  source: string;
  elements: ExcalidrawElement[];
  appState: { viewBackgroundColor: string; gridSize: null };
  files: Record<string, never>;
}

export interface DiagramTextMeasurer {
  measure(text: string, fontSize: number): { width: number; height: number };
}

export interface RenderedDiagram {
  spec: DiagramSpec;
  scene: ExcalidrawScene;
  svg: string;
  html: string;
  pngBase64: string;
}
