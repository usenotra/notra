export const DIAGRAM_SPEC_PATH = "diagram.json";
export const MIN_DIAGRAM_SPEC_BYTES = 200;

export const DIAGRAM_SKILL_DIR = ".agents/skills/excalidraw-diagram";
export const DIAGRAM_SKILL_PATH = `${DIAGRAM_SKILL_DIR}/SKILL.md`;
export const DIAGRAM_CHECK_SCRIPT_PATH = `${DIAGRAM_SKILL_DIR}/check.mjs`;

// Excalidraw font ids: 5 = Excalifont (hand-drawn), 6 = Nunito.
// Nunito is used because we can load it as TTF for server-side rendering.
export const EXCALIDRAW_FONT_FAMILY_NUNITO = 6;
export const DIAGRAM_FONT_FAMILY = "Nunito";
export const DIAGRAM_LINE_HEIGHT = 1.25;

export const DIAGRAM_DEFAULT_STROKE = "#1e1e1e";
export const DIAGRAM_DEFAULT_BACKGROUND = "#ffffff";
export const DIAGRAM_DEFAULT_FONT_SIZE = 20;
export const DIAGRAM_ARROW_LABEL_FONT_SIZE = 16;
export const DIAGRAM_DEFAULT_ROUGHNESS = 1;
export const DIAGRAM_DEFAULT_STROKE_WIDTH = 2;
export const DIAGRAM_SHAPE_PADDING = 20;
export const DIAGRAM_MIN_SHAPE_WIDTH = 120;
export const DIAGRAM_MIN_SHAPE_HEIGHT = 60;
export const DIAGRAM_BINDING_GAP = 8;
export const DIAGRAM_CANVAS_PADDING = 48;
// Arrows may graze a shape's outline; only count crossings this far inside.
export const DIAGRAM_LAYOUT_TOLERANCE = 6;
// Hand-edited angles and arrow focus below these are noise and not kept.
export const DIAGRAM_ANGLE_TOLERANCE = 0.001;
// An arrow end this close to where Notra would snap it counts as not moved.
export const DIAGRAM_ATTACHMENT_TOLERANCE = 2;
export const DIAGRAM_ROUNDED_CORNER_RADIUS = 32;
export const DIAGRAM_ROUNDED_CORNER_RATIO = 0.25;
export const DIAGRAM_ARROWHEAD_LENGTH = 16;
export const DIAGRAM_ARROWHEAD_ANGLE_DEG = 25;
// Ellipses and diamonds need extra room so a label fits inside the curve.
export const DIAGRAM_ELLIPSE_LABEL_FACTOR = 1.42;
export const DIAGRAM_DIAMOND_LABEL_FACTOR = 2;
export const EXCALIDRAW_ROUNDNESS_ADAPTIVE = 3;
export const EXCALIDRAW_ROUNDNESS_PROPORTIONAL = 2;
export const EXCALIDRAW_SCENE_SOURCE = "https://usenotra.com";

export const DIAGRAM_SKILL_CONTENT = `---
name: excalidraw-diagram
description: Author a hand-drawn Excalidraw explainer diagram as diagram.json. Covers the JSON format, layout rules, color palette, and the check script that validates the file before you stop.
---

# Excalidraw diagram

You write \`diagram.json\` in the repository root. Notra turns it into a real Excalidraw scene, renders a PNG in the hand-drawn Excalidraw style, and lets the user paste the editable scene into Excalidraw or tldraw. You never write SVG, HTML, or full Excalidraw elements yourself.

## Format

\`\`\`json
{
  "title": "How webhook retries work",
  "background": "#ffffff",
  "elements": [
    { "type": "rectangle", "id": "api", "x": 0, "y": 0, "width": 200, "height": 80, "label": "API route", "backgroundColor": "#a5d8ff", "rounded": true },
    { "type": "diamond", "id": "ok", "x": 320, "y": -10, "width": 180, "height": 100, "label": "2xx?" },
    { "type": "ellipse", "id": "done", "x": 620, "y": 0, "width": 160, "height": 80, "label": "Done", "backgroundColor": "#b2f2bb" },
    { "type": "arrow", "start": { "id": "api" }, "end": { "id": "ok" }, "label": "deliver" },
    { "type": "arrow", "start": { "id": "ok" }, "end": { "id": "done" }, "label": "yes" },
    { "type": "text", "x": 0, "y": -90, "text": "Webhook delivery", "fontSize": 32 }
  ]
}
\`\`\`

- Coordinates are canvas pixels. x/y is the top-left corner. Positive y goes down. Any origin works; the renderer fits the diagram into a 1200x630 image.
- Shapes: \`rectangle\`, \`ellipse\`, \`diamond\`. Give every shape that an arrow touches a unique \`id\`. \`label\` is centered inside the shape. Use \\n for line breaks.
- Width and height are optional. Shapes grow automatically to fit their label, so a too-small box never clips text, but it can then overlap a neighbour. Leave room.
- Text: free-floating \`text\` for titles and annotations. \`fontSize\` defaults to 20.
- Arrows and lines: \`start\` and \`end\` are either \`{ "id": "<shape id>" }\` (bound, snaps to the shape edge) or \`{ "x": 0, "y": 0 }\` (free point). Optional \`via\`: absolute \`[x, y]\` waypoints to route around shapes. Optional \`label\`, \`startArrowhead\`, \`endArrowhead\` (\`arrow\`, \`triangle\`, \`dot\`, \`bar\`, \`none\`). Arrows default to an arrowhead at the end only.
- Styling per element: \`strokeColor\`, \`backgroundColor\`, \`fillStyle\` (\`solid\` default, \`hachure\`, \`cross-hatch\`), \`strokeStyle\` (\`solid\`, \`dashed\`, \`dotted\`), \`strokeWidth\` (1, 2, 4), \`roughness\` (0 clean, 1 default sketchy, 2 very sketchy), \`rounded\` for rectangles.

## Layout rules

- Draw inside a 1100 x 530 box, starting at x 0, y 0. Notra renders that box at 1:1 into the 1200x630 image, so a fontSize 20 label really is 20px. If the diagram is bigger it gets scaled down and the text becomes too small to read on a social card. The check script reports the render scale; keep it at 0.9 or higher.
- Use the space: a diagram that only fills half the box gets scaled up and looks sparse. Aim for roughly 900 to 1100 wide and 380 to 530 tall including the title.
- 4 to 8 shapes. More than 10 becomes unreadable. Collapse detail into one labeled box rather than drawing every function.
- Use a grid: same height for shapes in a row, gaps of 80 to 140px between shapes so arrow labels fit, and arrows that run horizontally or vertically. Avoid diagonal arrows; if two shapes are not aligned, align them or route the arrow with \`via\` waypoints.
- Labels: 1 to 4 words, max 2 lines, fontSize 20 to 24. Arrow labels fontSize 16 to 18, 1 to 2 words. Nouns for shapes, verbs for arrows.
- Arrows should not cross shapes or other arrows. Reorder shapes or use \`via\` waypoints instead.
- One title text element at the top left (x 0, y 0), fontSize 36 to 44, then the diagram starting about 90px below it. Optional small annotations at fontSize 16.

## Palette

Excalidraw's own palette keeps the scene looking native when pasted:

- Strokes: #1e1e1e (default), #1971c2 blue, #2f9e44 green, #e03131 red, #f08c00 orange, #6741d9 violet
- Fills: #a5d8ff blue, #b2f2bb green, #ffc9c9 red, #ffec99 yellow, #d0bfff violet, #e9ecef gray

If a brand-identity skill exists, use one brand color as the accent (stroke or fill of the focal shape) and keep the rest neutral. Use 2 to 3 fill colors at most, each with a meaning (for example new vs existing, success vs failure).

## Check before you stop

Run \`node ${DIAGRAM_CHECK_SCRIPT_PATH}\` after every write. It validates the JSON, checks that arrow ids resolve, estimates label sizes, and reports overlapping shapes, arrow labels that do not fit their gap, and the render scale. Fix every ERROR and WARNING, then run it again.
`;

// Plain JS so it runs with the sandbox's node without a build step.
export const DIAGRAM_CHECK_SCRIPT = `import { readFileSync } from "node:fs";

const CHAR_WIDTH = 0.56;
const LINE_HEIGHT = 1.25;
const PADDING = 20;
const MIN_W = 120;
const MIN_H = 60;
const FACTORS = { rectangle: 1, ellipse: 1.42, diamond: 2 };
const SHAPES = new Set(["rectangle", "ellipse", "diamond"]);

const errors = [];
const warnings = [];
let spec;
try {
  spec = JSON.parse(readFileSync("${DIAGRAM_SPEC_PATH}", "utf8"));
} catch (error) {
  console.log("ERROR: ${DIAGRAM_SPEC_PATH} is missing or not valid JSON: " + error.message);
  process.exit(1);
}
if (!Array.isArray(spec.elements) || spec.elements.length === 0) {
  console.log("ERROR: elements must be a non-empty array");
  process.exit(1);
}

function labelText(label) {
  if (!label) return "";
  return typeof label === "string" ? label : String(label.text ?? "");
}
function measure(text, fontSize) {
  const lines = text.split("\\n");
  const width = Math.max(...lines.map((line) => line.length)) * fontSize * CHAR_WIDTH;
  return { width, height: lines.length * fontSize * LINE_HEIGHT, lines: lines.length };
}

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
// Arrows can only attach to shapes; an arrow ending at a text fails to render.
const shapeIds = new Set(spec.elements.filter((e) => isObject(e) && SHAPES.has(e.type) && e.id).map((e) => e.id));
const ids = new Map();
const boxes = [];
for (const [index, element] of spec.elements.entries()) {
  if (!isObject(element)) {
    errors.push("element " + index + ": must be an object");
    continue;
  }
  const where = "element " + index + (element.id ? " (" + element.id + ")" : "");
  if (element.id) {
    if (ids.has(element.id)) errors.push(where + ": duplicate id");
    ids.set(element.id, element);
  }
  if (SHAPES.has(element.type)) {
    const text = labelText(element.label);
    const fontSize = element.label?.fontSize ?? 20;
    const m = measure(text, fontSize);
    const factor = FACTORS[element.type];
    const needW = Math.max(MIN_W, m.width * factor + PADDING * 2);
    const needH = Math.max(MIN_H, m.height * factor + PADDING * 2);
    const width = Math.max(element.width ?? 0, needW);
    const height = Math.max(element.height ?? 0, needH);
    if (element.width && element.width < needW) warnings.push(where + ": label needs ~" + Math.round(needW) + "px width, will grow from " + element.width);
    if (element.height && element.height < needH) warnings.push(where + ": label needs ~" + Math.round(needH) + "px height, will grow from " + element.height);
    if (m.lines > 2) warnings.push(where + ": label has " + m.lines + " lines, keep it to 2");
    // Shapes grow around their authored center, like the renderer does.
    const x = element.x - (width - (element.width ?? width)) / 2;
    const y = element.y - (height - (element.height ?? height)) / 2;
    boxes.push({ where, id: element.id, x, y, width, height });
  } else if (element.type === "text") {
    const m = measure(String(element.text ?? ""), element.fontSize ?? 20);
    boxes.push({ where, x: element.x, y: element.y, width: m.width, height: m.height, text: true });
  } else if (element.type === "arrow" || element.type === "line") {
    for (const end of ["start", "end"]) {
      const point = element[end];
      if (!isObject(point)) errors.push(where + ": " + end + " must be an object with an id, or with x and y");
      else if ("id" in point && !shapeIds.has(point.id)) errors.push(where + ": " + end + " id '" + point.id + "' is not a rectangle, ellipse, or diamond");
    }
    if (isObject(element.start) && isObject(element.end) && element.start.id && element.start.id === element.end.id && !element.via?.length) errors.push(where + ": starts and ends at '" + element.start.id + "'; add via points to draw a loop");
  } else {
    errors.push(where + ": unknown type '" + element.type + "'");
  }
}

const boxById = new Map();
for (const box of boxes) if (box.id) boxById.set(box.id, box);
for (const [index, element] of spec.elements.entries()) {
  if (!isObject(element) || (element.type !== "arrow" && element.type !== "line")) continue;
  const text = labelText(element.label);
  if (!text || element.via) continue;
  const a = boxById.get(element.start?.id);
  const b = boxById.get(element.end?.id);
  if (!a || !b) continue;
  const fontSize = element.label?.fontSize ?? 16;
  const label = measure(text, fontSize);
  const gapX = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width));
  const gapY = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height));
  const horizontal = gapX >= gapY;
  const gap = horizontal ? gapX : gapY;
  const needed = (horizontal ? label.width : label.height) + 40;
  if (gap < needed) warnings.push("element " + index + ": arrow label '" + text + "' needs ~" + Math.round(needed) + "px between " + element.start.id + " and " + element.end.id + ", gap is " + Math.round(gap) + "px. Widen the gap or shorten the label");
}

for (let i = 0; i < boxes.length; i++) {
  for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i];
    const b = boxes[j];
    const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    if (overlap) warnings.push("overlap: " + a.where + " and " + b.where);
  }
}

if (boxes.length > 0) {
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));
  const ratio = (maxX - minX) / Math.max(1, maxY - minY);
  const width = maxX - minX;
  const height = maxY - minY;
  console.log("bounds: " + Math.round(width) + "x" + Math.round(height) + " (target box 1100x530, aspect " + ratio.toFixed(2) + ")");
  const scale = Math.min(1.6, (1200 - 96) / width, (630 - 96) / height);
  console.log("render scale: " + scale.toFixed(2));
  if (scale < 0.9) warnings.push("diagram is " + Math.round(width) + "x" + Math.round(height) + ", larger than the 1100x530 box: text renders at " + Math.round(scale * 100) + "% size. Tighten gaps, shorten labels, or drop a shape");
  if (width < 700 && height < 340) warnings.push("diagram only uses " + Math.round(width) + "x" + Math.round(height) + " of the 1100x530 box; spread it out or enlarge shapes");
}

const shapeCount = spec.elements.filter((e) => isObject(e) && SHAPES.has(e.type)).length;
if (shapeCount > 10) warnings.push(shapeCount + " shapes, keep it to 8 or fewer");

for (const error of errors) console.log("ERROR: " + error);
for (const warning of warnings) console.log("WARNING: " + warning);
console.log(errors.length === 0 && warnings.length === 0 ? "OK" : errors.length + " error(s), " + warnings.length + " warning(s)");
process.exit(errors.length > 0 ? 1 : 0);
`;

// Fast spec edits run without a sandbox. Benchmarked 2026-10-02 on 6 edit
// tasks x 4 runs with the layout-check retry: GPT-6 Luna passed 23/24 with
// 23/24 clean layouts at ~$0.0013 per edit; Sonnet 5 passed 24/24 with 22/24
// clean at ~$0.027, same ~13 s median.
export const DIAGRAM_EDIT_MODEL_ID = "vercel/openai/gpt-6-luna";
// Luna is cheap enough that a third layout-fix round costs well under a cent.
export const DIAGRAM_EDIT_ATTEMPTS = 3;
// Luna answers in ~15 s; a fallback model with thinking can take minutes.
export const DIAGRAM_EDIT_ATTEMPT_TIMEOUT_MS = 60_000;
export const DIAGRAM_EDIT_MAX_OUTPUT_TOKENS = 16_000;
// Both keys are set so a router fallback to Claude also skips thinking: Sonnet
// 5 at low effort took 90 to 220 s per edit versus ~13 s with thinking off.
export const DIAGRAM_EDIT_PROVIDER_OPTIONS = {
  openai: { reasoningEffort: "low" },
  anthropic: { thinking: { type: "disabled" } },
};
export const JSON_CODE_FENCE_REGEX = /```(?:json)?\s*([\s\S]*?)```/;
export const DIAGRAM_SHAPE_TYPES = ["rectangle", "ellipse", "diamond"] as const;

// Spec limits. Hand-edited scenes are clamped to these on save, so a normal
// Excalidraw edit never fails validation, and a crafted one cannot make the
// renderer draw a 100k px hachure fill or a megabyte of glyph paths.
export const DIAGRAM_MAX_ELEMENTS = 150;
export const DIAGRAM_MAX_VIA_POINTS = 12;
export const DIAGRAM_MAX_TEXT_LENGTH = 2000;
export const DIAGRAM_MAX_SHAPE_SIZE = 10_000;
export const DIAGRAM_MAX_COORDINATE = 100_000;
export const DIAGRAM_MAX_FONT_SIZE = 120;
export const DIAGRAM_MAX_LABEL_FONT_SIZE = 96;
export const DIAGRAM_MAX_STROKE_WIDTH = 8;
// Excalidraw arrowheads the spec has no equivalent for, drawn as the closest one.
export const DIAGRAM_ARROWHEAD_FALLBACKS: Record<string, string> = {
  circle: "dot",
  circle_outline: "dot",
  diamond: "dot",
  diamond_outline: "dot",
  triangle_outline: "triangle",
  crowfoot_one: "bar",
  crowfoot_many: "arrow",
  crowfoot_one_or_many: "arrow",
};
