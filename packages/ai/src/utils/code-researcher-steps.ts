import { calculateTokenCostUsd } from "@notra/ai/billing/token-pricing";
import {
  CODE_RESEARCHER_STEP_MAX_ARRAY_ITEMS,
  CODE_RESEARCHER_STEP_MAX_STRING_CHARS,
  CODE_RESEARCHER_STEP_OMITTED_KEYS,
} from "@notra/ai/constants/code-research";
import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { CodeResearcherStep } from "@notra/ai/types/code-research";

const MAX_DEPTH = 4;

/**
 * Step outputs are persisted with the chat message, so file contents and
 * diffs are dropped and long values trimmed. The model never sees these; it
 * only gets the final brief.
 */
export function compactStepValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") {
    return value.length > CODE_RESEARCHER_STEP_MAX_STRING_CHARS
      ? `${value.slice(0, CODE_RESEARCHER_STEP_MAX_STRING_CHARS)}…`
      : value;
  }
  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) {
      return `[${String(value.length)} items]`;
    }
    return value
      .slice(0, CODE_RESEARCHER_STEP_MAX_ARRAY_ITEMS)
      .map((item) => compactStepValue(item, depth + 1));
  }
  if (value && typeof value === "object") {
    if (depth >= MAX_DEPTH) {
      return "{…}";
    }
    const compact: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(value)) {
      compact[key] = CODE_RESEARCHER_STEP_OMITTED_KEYS.has(key)
        ? `[${String(typeof field === "string" ? field.length : 0)} chars omitted]`
        : compactStepValue(field, depth + 1);
    }
    return compact;
  }
  return value;
}

export function startStep(
  steps: CodeResearcherStep[],
  toolCallId: string,
  toolName: string,
  input: unknown
): CodeResearcherStep[] {
  return [
    ...steps,
    {
      toolCallId,
      toolName,
      state: "input-available",
      input: compactStepValue(input),
    },
  ];
}

export function finishStep(
  steps: CodeResearcherStep[],
  toolCallId: string,
  result: { output?: unknown; errorText?: string }
): CodeResearcherStep[] {
  return steps.map((step) => {
    if (step.toolCallId !== toolCallId) {
      return step;
    }
    return result.errorText
      ? {
          ...step,
          state: "output-error",
          errorText: String(compactStepValue(result.errorText)),
        }
      : {
          ...step,
          state: "output-available",
          output: compactStepValue(result.output),
        };
  });
}

function promptTokens(usage: AgentTokenUsage): number {
  return usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
}

/**
 * Adds one model step to the running total. Cost is priced per step, since
 * long-context pricing depends on the size of each call, not the sum.
 */
export function addStepUsage(
  total: AgentTokenUsage | null,
  step: AgentTokenUsage
): AgentTokenUsage {
  const stepCost = calculateTokenCostUsd(step, AGENT_DEFAULT_MODEL);
  if (!total) {
    return {
      ...step,
      maxPromptTokens: promptTokens(step),
      tokenCostUsd: stepCost,
    };
  }
  return {
    inputTokens: total.inputTokens + step.inputTokens,
    outputTokens: total.outputTokens + step.outputTokens,
    totalTokens: total.totalTokens + step.totalTokens,
    cacheReadTokens: total.cacheReadTokens + step.cacheReadTokens,
    cacheWriteTokens: total.cacheWriteTokens + step.cacheWriteTokens,
    reasoningTokens: (total.reasoningTokens ?? 0) + (step.reasoningTokens ?? 0),
    modelId: total.modelId ?? step.modelId,
    maxPromptTokens: Math.max(total.maxPromptTokens ?? 0, promptTokens(step)),
    tokenCostUsd: (total.tokenCostUsd ?? 0) + stepCost,
  };
}
