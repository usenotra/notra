import {
  DIAGRAM_EDIT_ATTEMPT_TIMEOUT_MS,
  DIAGRAM_EDIT_ATTEMPTS,
  DIAGRAM_EDIT_MAX_OUTPUT_TOKENS,
  DIAGRAM_EDIT_MODEL_ID,
  DIAGRAM_EDIT_PROVIDER_OPTIONS,
  JSON_CODE_FENCE_REGEX,
} from "@notra/ai/constants/excalidraw-diagram";
import { gateway } from "@notra/ai/gateway";
import {
  buildDiagramEditPrompt,
  buildDiagramEditSystemPrompt,
} from "@notra/ai/prompts/diagram-edit";
import { withRouterDefaults } from "@notra/ai/provider-options";
import { diagramSpecSchema } from "@notra/ai/schemas/excalidraw-diagram";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { DiagramSpec } from "@notra/ai/types/excalidraw-diagram";
import {
  describeDiagramSpecError,
  isDiagramSpecError,
} from "@notra/ai/utils/excalidraw-diagram";
import { findDiagramLayoutIssues } from "@notra/ai/utils/excalidraw-layout-check";
import { renderDiagram } from "@notra/ai/utils/excalidraw-render";
import { logWarn } from "@notra/ai/utils/server-log";
import { toAgentTokenUsage } from "@notra/ai/utils/token-usage";
import { generateText } from "ai";

const VERCEL_MODEL_PREFIX_REGEX = /^vercel\//;

// Models often write a multi-line label with a literal line break instead of
// "\n", which is invalid JSON. Escape raw line breaks that sit inside strings.
function escapeRawNewlinesInStrings(json: string) {
  let output = "";
  let inString = false;
  let escaped = false;
  for (const char of json) {
    if (inString && (char === "\n" || char === "\r")) {
      output += char === "\n" ? "\\n" : "";
      escaped = false;
      continue;
    }
    if (char === '"' && !escaped) {
      inString = !inString;
    }
    escaped = inString && char === "\\" && !escaped;
    output += char;
  }
  return output;
}

/** Parses a model answer into a spec, tolerating code fences and raw newlines. */
export function parseDiagramSpecText(text: string): DiagramSpec {
  const fenced = text.match(JSON_CODE_FENCE_REGEX)?.[1];
  const candidate = (fenced ?? text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const json =
    start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  return diagramSpecSchema.parse(JSON.parse(escapeRawNewlinesInStrings(json)));
}

/** Applies a natural-language change to a diagram spec without a sandbox. */
export async function editDiagramSpecWithAi(params: {
  spec: DiagramSpec;
  prompt: string;
  organizationId: string;
  /** Override for model comparisons; production uses DIAGRAM_EDIT_MODEL_ID. */
  modelId?: string;
  providerOptions?: Record<string, Record<string, unknown>>;
}): Promise<{
  spec: DiagramSpec;
  usage: AgentTokenUsage;
  attempts: number;
  layoutIssues: string[];
}> {
  const modelId = params.modelId ?? DIAGRAM_EDIT_MODEL_ID;
  const usage: AgentTokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    // Billing prices by provider model id; the "vercel/" routing prefix is
    // not in the pricing table for every model.
    modelId: modelId.replace(VERCEL_MODEL_PREFIX_REGEX, ""),
  };
  let best: { spec: DiagramSpec; issues: string[] } | undefined;
  // Layout problems of the last valid answer, and why the latest answer
  // could not be used at all; the model gets each under its own heading.
  let layoutError: string | undefined;
  let answerError: string | undefined;
  let lastValid: DiagramSpec | undefined;
  // Problems the diagram already has (often on purpose after a hand edit) are
  // not the edit's job; only problems the edit introduces need another round.
  const existingIssues = new Set(
    findDiagramLayoutIssues((await renderDiagram(params.spec)).scene)
  );

  for (let attempt = 1; attempt <= DIAGRAM_EDIT_ATTEMPTS; attempt++) {
    let result: Awaited<ReturnType<typeof generateText>>;
    try {
      result = await generateText({
        model: gateway(modelId, {
          organizationId: params.organizationId,
        }),
        system: buildDiagramEditSystemPrompt(),
        // After a layout-only failure, fix the previous answer instead of
        // redoing the whole change from the original diagram.
        prompt: lastValid
          ? buildDiagramEditPrompt({
              spec: lastValid,
              prompt: `Fix these layout problems and change nothing else:\n${layoutError}`,
              error: answerError,
            })
          : buildDiagramEditPrompt({
              spec: params.spec,
              prompt: params.prompt,
              error: answerError,
            }),
        maxOutputTokens: DIAGRAM_EDIT_MAX_OUTPUT_TOKENS,
        abortSignal: AbortSignal.timeout(DIAGRAM_EDIT_ATTEMPT_TIMEOUT_MS),
        providerOptions: withRouterDefaults(
          {
            gateway: { tags: ["content-diagram-edit"] },
            ...(params.providerOptions ?? DIAGRAM_EDIT_PROVIDER_OPTIONS),
          },
          { modelId }
        ),
      });
    } catch (caught) {
      // A failed or timed-out fix round should not throw away a usable edit.
      if (best) {
        logWarn("[diagram-edit] Edit attempt failed; keeping best result", {
          attempt,
          error: caught instanceof Error ? caught.message : String(caught),
        });
        break;
      }
      throw caught;
    }
    const callUsage = toAgentTokenUsage(result.usage);
    usage.inputTokens += callUsage.inputTokens;
    usage.outputTokens += callUsage.outputTokens;
    usage.totalTokens += callUsage.totalTokens;
    usage.cacheReadTokens += callUsage.cacheReadTokens;
    usage.cacheWriteTokens += callUsage.cacheWriteTokens;

    if (result.finishReason === "length") {
      // The whole diagram did not fit in the answer; more rounds hit the
      // same limit.
      if (best) {
        break;
      }
      throw new Error(
        "This diagram is too large for a quick edit. Retry with useRepository to edit it in the sandbox."
      );
    }

    try {
      const spec = parseDiagramSpecText(result.text);
      // Building the scene catches dangling arrow ids before we save anything.
      const rendered = await renderDiagram(spec);
      const issues = findDiagramLayoutIssues(rendered.scene).filter(
        (issue) => !existingIssues.has(issue)
      );
      if (issues.length === 0) {
        return { spec, usage, attempts: attempt, layoutIssues: [] };
      }
      // Layout issues are worth one more round, but an imperfect valid
      // diagram beats failing the edit.
      lastValid = spec;
      // A fix round can make things worse; keep the attempt with the fewest
      // problems as the fallback.
      if (!best || issues.length < best.issues.length) {
        best = { spec, issues };
      }
      layoutError = `- ${issues.join("\n- ")}`;
      answerError = undefined;
    } catch (caught) {
      if (!isDiagramSpecError(caught)) {
        if (best) {
          break;
        }
        throw caught;
      }
      answerError = describeDiagramSpecError(caught);
    }
    logWarn("[diagram-edit] Edit attempt rejected", {
      attempt,
      maxAttempts: DIAGRAM_EDIT_ATTEMPTS,
      finishReason: result.finishReason,
      outputChars: result.text.length,
      error: answerError ?? layoutError,
    });
  }

  if (best) {
    return {
      spec: best.spec,
      usage,
      attempts: DIAGRAM_EDIT_ATTEMPTS,
      layoutIssues: best.issues,
    };
  }
  throw new Error(
    `The diagram edit did not produce a valid diagram: ${answerError ?? layoutError}`
  );
}
