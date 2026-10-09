import {
  DIAGRAM_CHECK_SCRIPT_PATH,
  DIAGRAM_SPEC_PATH,
} from "@notra/ai/constants/excalidraw-diagram";
import { describeSource } from "@notra/ai/prompts/marketing-assets";
import type { RepoImageSourceContext } from "@notra/ai/types/repo-image";
import dedent from "dedent";

export function buildDiagramExtractionPrompt(params: {
  owner: string;
  repo: string;
  branch: string;
  source: RepoImageSourceContext;
}) {
  const { owner, repo, branch, source } = params;

  return dedent`<role>
You are a senior engineer who is great at explaining systems on a whiteboard. You draw one hand-drawn Excalidraw diagram that explains how something in this repository works, so a developer reading a changelog or social post understands it in ten seconds.
</role>

<task-context>
The repository ${owner}/${repo}@${branch} is cloned at /workspace/home/${repo}, and your current working directory is that repo. Read the code you need, then write ${DIAGRAM_SPEC_PATH} in the current working directory. Notra turns it into an editable Excalidraw scene and a 1200x630 PNG.
</task-context>

<required-skills>
You MUST load the excalidraw-diagram skill before writing anything. It defines the only accepted ${DIAGRAM_SPEC_PATH} format, the layout rules, the palette, and the check script. If a brand-identity skill exists, load it and use one brand color as the accent. If a humanizer skill exists, apply it to every visible label.
</required-skills>

<deliverable>
Your task ends ONLY after ${DIAGRAM_SPEC_PATH} exists and \`node ${DIAGRAM_CHECK_SCRIPT_PATH}\` prints no ERROR and no WARNING.

Reliability checkpoint: after loading the skill, your first file mutation MUST be a valid draft ${DIAGRAM_SPEC_PATH} with 3 to 5 shapes that reflects the subject. Then research and overwrite it.
</deliverable>

<subject>
${describeSource(source)}

The diagram is about this subject only. Do not depict unrelated parts of the system.
</subject>

<research>
1. Read the actual code for the subject: the diff for a PR or commit, or the files that implement the named feature. Follow the call path far enough to name the real moving parts: entry points, services, queues, stores, external APIs, and the decision points between them.
2. Decide what kind of diagram explains it best: a request or data flow (left to right), a before/after comparison (two rows), a state machine (states plus labeled transitions), or a component map (grouped boxes). Pick one.
3. Name things the way a user of this codebase would recognise them. Use real names from the code for components, but shorten long identifiers. No file paths, no code snippets.
</research>

<diagram-plan>
Before writing the final file, write a short plan in your head or in diagram-plan.md:
- **Diagram type:** flow, before/after, state machine, or component map, with a because-clause.
- **Nodes:** 4 to 8 shapes, each with a 1 to 4 word label and the shape type (rectangle for components, diamond for decisions, ellipse for start/end or external actors).
- **Edges:** which nodes connect, with a short verb label where it adds meaning.
- **Emphasis:** which node or edge is the point of the change. Give it the accent fill color; keep the rest neutral or gray.
- **Grid:** row and column positions inside the 1100x530 box from the skill.
</diagram-plan>

<the-ask>
1. Load the excalidraw-diagram skill and write a first draft ${DIAGRAM_SPEC_PATH}.
2. Research the subject in the repo.
3. Write the plan.
4. Overwrite ${DIAGRAM_SPEC_PATH} with the final diagram, including one title text element above it.
5. Run \`node ${DIAGRAM_CHECK_SCRIPT_PATH}\`, fix every ERROR and WARNING, and run it again until it is clean.
6. Stop.
</the-ask>`;
}

export function buildDiagramRevisionPrompt(params: { prompt: string }) {
  return dedent`<role>
You are editing an existing hand-drawn Excalidraw diagram. You are in a restored sandbox that still contains the repository and the current ${DIAGRAM_SPEC_PATH}.
</role>

<task>
Apply this requested change to the diagram:

${params.prompt}
</task>

<required-steps>
1. Load the excalidraw-diagram skill if you have not in this session.
2. Read ${DIAGRAM_SPEC_PATH}.
3. Change only what the request needs. Keep the existing layout, ids, colors, and labels unless the request is about them.
4. Write the file back, run \`node ${DIAGRAM_CHECK_SCRIPT_PATH}\`, and fix every ERROR and WARNING.
5. Stop.
</required-steps>`;
}

export function buildDiagramMissingOutputPrompt(error?: string) {
  if (error) {
    return dedent`Notra could not render ${DIAGRAM_SPEC_PATH}:

${error}

Fix ${DIAGRAM_SPEC_PATH} so it follows the excalidraw-diagram skill format exactly, run \`node ${DIAGRAM_CHECK_SCRIPT_PATH}\` until it is clean, and stop.`;
  }

  return dedent`The required file is missing or incomplete: ${DIAGRAM_SPEC_PATH}

Continue from the previous instructions and write it now from the repo context you already inspected, following the excalidraw-diagram skill format. Run \`node ${DIAGRAM_CHECK_SCRIPT_PATH}\` until it is clean, and stop.`;
}

export function buildDiagramReviewPrompt(params: {
  source: RepoImageSourceContext;
}) {
  return dedent`Review the attached rendered 1200x630 hand-drawn diagram for layout problems a reader would notice.

Subject:
${describeSource(params.source)}

Fail only for concrete, visible problems:
- Text that overlaps a shape border, another label, or an arrow so it is hard to read.
- Arrows that pass through unrelated shapes, or arrows whose direction is ambiguous.
- Shapes overlapping each other.
- Text so small it is hard to read at this size: shape labels clearly smaller than about 18px or arrow labels smaller than about 14px in the 1200x630 image. Ask to tighten the layout into the 1100x530 box rather than to raise font sizes.
- A diagram that only fills a small part of the canvas.
- Diagonal arrows that make the flow hard to follow when the shapes could be aligned.
- A missing or clearly wrong title for the subject.

Pass if the diagram is readable and tidy, even if you would have drawn it differently. Do not ask for style changes.

If it fails, write a concise revision prompt for the agent editing diagram.json. Name the shapes or labels involved and say how to fix them (move, resize, reroute with via waypoints, shorten a label). Preserve everything else.`;
}
