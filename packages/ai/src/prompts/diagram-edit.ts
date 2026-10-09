import { DIAGRAM_SKILL_CONTENT } from "@notra/ai/constants/excalidraw-diagram";
import type { DiagramSpec } from "@notra/ai/types/excalidraw-diagram";
import dedent from "dedent";

// Reuse the sandbox skill's format, layout, and palette sections so both edit
// paths follow the same rules. The check-script section only applies in the sandbox.
const DIAGRAM_RULES = DIAGRAM_SKILL_CONTENT.slice(
  DIAGRAM_SKILL_CONTENT.indexOf("## Format"),
  DIAGRAM_SKILL_CONTENT.indexOf("## Check before you stop")
).trim();

export function buildDiagramEditSystemPrompt() {
  return dedent`You edit hand-drawn Excalidraw explainer diagrams for Notra. You receive the current diagram.json and a change request, and you return the complete updated diagram.json.

${DIAGRAM_RULES}

## Editing rules

- Return the whole diagram, not a diff. Output only the JSON object, no prose and no code fence.
- Make the smallest change that satisfies the request. Keep ids, positions, sizes, colors, and labels of everything the request does not touch.
- When you add or move shapes, keep the layout inside the 1100 x 530 box, keep gaps of at least 80px, and make sure arrow labels still fit between the shapes they connect.
- Keep \`angle\`, \`anchor\`, and \`curved\` fields the user set by hand unless the request is about them. Drop an arrow end's \`anchor\` when you move that arrow to a different shape.
- Keep every arrow's start and end id pointing at a shape that still exists. If you remove a shape, remove or reconnect its arrows.`;
}

export function buildDiagramEditPrompt(params: {
  spec: DiagramSpec;
  prompt: string;
  error?: string;
}) {
  const retry = params.error
    ? `\n\nYour previous answer could not be used:\n${params.error}\nReturn a corrected, complete diagram.json.`
    : "";
  return dedent`Current diagram.json:

${JSON.stringify(params.spec)}

Change request:
${params.prompt}${retry}`;
}
