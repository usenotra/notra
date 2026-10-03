import type { UIMessage } from "ai";

import { CODE_RESEARCH_STAGE_DEFINITIONS } from "@/constants/design-system-code-research";
import type {
  CodeResearchChatMessage,
  CodeResearchChatOp,
  CodeResearchPlaybackState,
  CodeResearchSandboxPatch,
  CodeResearchSandboxState,
  CodeResearchStage,
  CodeResearchStep,
  CodeResearchTimelineItem,
} from "@/types/design-system/code-research";

type ChatPart = UIMessage["parts"][number];

function initialStages(): CodeResearchStage[] {
  return CODE_RESEARCH_STAGE_DEFINITIONS.map((stage) => ({
    ...stage,
    status: "pending",
  }));
}

function createInitialSandboxState(): CodeResearchSandboxState {
  return {
    phase: "none",
    boxId: null,
    checkedOut: null,
    headSha: null,
    expiresLabel: null,
    redis: "empty",
    execCount: 0,
    stages: initialStages(),
  };
}

function applySandboxPatch(
  sandbox: CodeResearchSandboxState,
  patch: CodeResearchSandboxPatch
): CodeResearchSandboxState {
  const { stages, stageMs, resetStages, ...fields } = patch;
  const baseStages = resetStages ? initialStages() : sandbox.stages;
  return {
    ...sandbox,
    ...fields,
    stages: baseStages.map((stage) => ({
      ...stage,
      status: stages?.[stage.id] ?? stage.status,
      realMs: stageMs?.[stage.id] ?? (resetStages ? undefined : stage.realMs),
    })),
  };
}

function toolPart(
  toolCallId: string,
  toolName: string,
  input: unknown
): ChatPart {
  return {
    type: "dynamic-tool",
    toolCallId,
    toolName,
    state: "input-available",
    input,
  } as ChatPart;
}

function finishToolPart(
  part: ChatPart,
  op: Extract<CodeResearchChatOp, { kind: "tool-end" }>
): ChatPart {
  if (part.type !== "dynamic-tool" || part.toolCallId !== op.toolCallId) {
    return part;
  }
  if (op.errorText) {
    return {
      ...part,
      state: "output-error",
      errorText: op.errorText,
    } as ChatPart;
  }
  return { ...part, state: "output-available", output: op.output } as ChatPart;
}

function updateLastAssistant(
  timeline: CodeResearchTimelineItem[],
  update: (message: CodeResearchChatMessage) => CodeResearchChatMessage
): CodeResearchTimelineItem[] {
  const index = timeline.findLastIndex(
    (item) => item.kind === "message" && item.message.role === "assistant"
  );
  const item = timeline[index];
  if (!item || item.kind !== "message") {
    return timeline;
  }
  const next = [...timeline];
  next[index] = { kind: "message", message: update(item.message) };
  return next;
}

function applyChatOp(
  timeline: CodeResearchTimelineItem[],
  op: CodeResearchChatOp
): CodeResearchTimelineItem[] {
  switch (op.kind) {
    case "user":
      return [
        ...timeline,
        {
          kind: "message",
          message: {
            id: op.messageId,
            role: "user",
            text: op.text,
            parts: [{ type: "text", text: op.text }],
            isStreaming: false,
          },
        },
      ];
    case "assistant-start":
      return [
        ...timeline,
        {
          kind: "message",
          message: {
            id: op.messageId,
            role: "assistant",
            text: "",
            parts: [],
            isStreaming: true,
          },
        },
      ];
    case "text":
      return updateLastAssistant(timeline, (message) => ({
        ...message,
        parts: [...message.parts, { type: "text", text: op.text }],
      }));
    case "tool-start":
      return updateLastAssistant(timeline, (message) => ({
        ...message,
        parts: [
          ...message.parts,
          toolPart(op.toolCallId, op.toolName, op.input),
        ],
      }));
    case "tool-end":
      return updateLastAssistant(timeline, (message) => ({
        ...message,
        parts: message.parts.map((part) => finishToolPart(part, op)),
      }));
    case "assistant-end":
      return updateLastAssistant(timeline, (message) => ({
        ...message,
        isStreaming: false,
      }));
    case "divider":
      return [...timeline, { kind: "divider", id: op.id, label: op.label }];
    default: {
      const exhaustive: never = op;
      return exhaustive;
    }
  }
}

/**
 * Replays the first `cursor` steps from scratch. Playback is deterministic,
 * so stepping backwards is just a replay with a smaller cursor.
 */
export function deriveCodeResearchState(
  steps: CodeResearchStep[],
  cursor: number
): CodeResearchPlaybackState {
  let timeline: CodeResearchTimelineItem[] = [];
  let sandbox = createInitialSandboxState();
  const log: CodeResearchPlaybackState["log"] = [];
  let explanation: CodeResearchPlaybackState["explanation"] = null;
  const toolAgents: CodeResearchPlaybackState["toolAgents"] = {};

  for (const [index, step] of steps.slice(0, cursor).entries()) {
    if (step.chat) {
      timeline = applyChatOp(timeline, step.chat);
      if (step.chat.kind === "tool-start") {
        toolAgents[step.chat.toolCallId] = step.chat.agent;
      }
    }
    if (step.sandbox) {
      sandbox = applySandboxPatch(sandbox, step.sandbox);
    }
    if (step.log) {
      log.push({ ...step.log, step: index });
    }
    if (step.explain) {
      explanation = step.explain;
    }
  }

  return { timeline, sandbox, log, explanation, toolAgents };
}
