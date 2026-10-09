import {
  DIAGRAM_MAX_COORDINATE,
  DIAGRAM_MAX_ELEMENTS,
  DIAGRAM_MAX_FONT_SIZE,
  DIAGRAM_MAX_LABEL_FONT_SIZE,
  DIAGRAM_MAX_SHAPE_SIZE,
  DIAGRAM_MAX_STROKE_WIDTH,
  DIAGRAM_MAX_TEXT_LENGTH,
  DIAGRAM_MAX_VIA_POINTS,
} from "@notra/ai/constants/excalidraw-diagram";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

const coordinateSchema = z
  .number()
  .min(-DIAGRAM_MAX_COORDINATE)
  .max(DIAGRAM_MAX_COORDINATE);
const sizeSchema = z.number().positive().max(DIAGRAM_MAX_SHAPE_SIZE);
const textContentSchema = z.string().max(DIAGRAM_MAX_TEXT_LENGTH);

const colorSchema = z.string().trim().min(1).max(40);

const labelSchema = z
  .union([
    textContentSchema,
    z.object({
      text: textContentSchema,
      fontSize: z
        .number()
        .positive()
        .max(DIAGRAM_MAX_LABEL_FONT_SIZE)
        .optional(),
      strokeColor: colorSchema.optional(),
    }),
  ])
  .transform((value) => (typeof value === "string" ? { text: value } : value));

const sharedStyleFields = {
  id: z.string().trim().min(1).max(80).optional(),
  strokeColor: colorSchema.optional(),
  backgroundColor: colorSchema.optional(),
  fillStyle: z.enum(["solid", "hachure", "cross-hatch", "zigzag"]).optional(),
  strokeWidth: z.number().positive().max(DIAGRAM_MAX_STROKE_WIDTH).optional(),
  strokeStyle: z.enum(["solid", "dashed", "dotted"]).optional(),
  roughness: z.number().min(0).max(2).optional(),
  opacity: z.number().min(0).max(100).optional(),
};

// Radians, clockwise, around the element's center (Excalidraw's convention).
const angleSchema = z.number().min(-7).max(7).optional();

const shapeSchema = z.object({
  ...sharedStyleFields,
  type: z.enum(["rectangle", "ellipse", "diamond"]),
  x: coordinateSchema,
  y: coordinateSchema,
  width: sizeSchema.optional(),
  height: sizeSchema.optional(),
  rounded: z.boolean().optional(),
  angle: angleSchema,
  label: labelSchema.optional(),
});

const textSchema = z.object({
  ...sharedStyleFields,
  type: z.literal("text"),
  x: coordinateSchema,
  y: coordinateSchema,
  text: textContentSchema.min(1),
  fontSize: z.number().positive().max(DIAGRAM_MAX_FONT_SIZE).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  angle: angleSchema,
});

const endpointSchema = z.union([
  z.object({
    id: z.string().trim().min(1),
    // Where the arrow meets the shape, as a fraction of its unrotated box
    // ([0, 0] top-left, [1, 1] bottom-right). Omit to snap to the edge.
    anchor: z
      .tuple([z.number().min(-1).max(2), z.number().min(-1).max(2)])
      .optional(),
    // Excalidraw's binding focus for an anchored end, so the editor keeps the
    // attachment when the shape moves.
    focus: z.number().min(-1).max(1).optional(),
  }),
  z.object({ x: coordinateSchema, y: coordinateSchema }),
]);

const arrowheadSchema = z
  .enum(["arrow", "triangle", "dot", "bar", "none"])
  .nullable()
  .optional();

const linearSchema = z.object({
  ...sharedStyleFields,
  type: z.enum(["arrow", "line"]),
  start: endpointSchema,
  end: endpointSchema,
  via: z
    .array(z.tuple([coordinateSchema, coordinateSchema]))
    .max(DIAGRAM_MAX_VIA_POINTS)
    .optional(),
  label: labelSchema.optional(),
  // Set when the user curved the arrow in the editor; Notra draws sharp elbows.
  curved: z.boolean().optional(),
  startArrowhead: arrowheadSchema,
  endArrowhead: arrowheadSchema,
});

export const diagramElementSchema = z.discriminatedUnion("type", [
  shapeSchema,
  textSchema,
  linearSchema,
]);

export const diagramSpecSchema = z.object({
  title: z.string().optional(),
  background: colorSchema.optional(),
  elements: z.array(diagramElementSchema).min(1).max(DIAGRAM_MAX_ELEMENTS),
});

export const diagramReviewSchema = z.object({
  needsRevision: z.boolean(),
  reason: z.string().min(1),
  revisionPrompt: z.string().nullable(),
});
