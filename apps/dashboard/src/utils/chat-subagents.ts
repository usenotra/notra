import { CHAT_SUBAGENTS } from "@/constants/chat-subagents";
import type {
  ChatSubagentResult,
  ChatSubagentStep,
} from "@/types/components/chat-subagent-block";

const SKIPPED_STATUSES = new Set(["unavailable", "not_found"]);

export function isChatSubagentName(toolName: string): boolean {
  return Object.hasOwn(CHAT_SUBAGENTS, toolName);
}

function readString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field ? field : null;
}

/** Tool calls the subagent streamed as preliminary output, if any. */
export function getChatSubagentSteps(output: unknown): ChatSubagentStep[] {
  if (!output || typeof output !== "object") {
    return [];
  }
  const { steps } = output as { steps?: unknown };
  if (!Array.isArray(steps)) {
    return [];
  }
  return steps.filter(
    (step): step is ChatSubagentStep =>
      typeof step === "object" &&
      step !== null &&
      typeof (step as ChatSubagentStep).toolCallId === "string" &&
      typeof (step as ChatSubagentStep).toolName === "string" &&
      typeof (step as ChatSubagentStep).state === "string"
  );
}

/** Tool wrappers turn thrown errors into `{ isError, error }` outputs. */
export function getChatSubagentErrorText(output: unknown): string | undefined {
  if (!output || typeof output !== "object") {
    return undefined;
  }
  const { isError, error } = output as { isError?: unknown; error?: unknown };
  return isError === true && typeof error === "string" ? error : undefined;
}

/** Finished, but returned without doing its job (for example, no brief). */
export function isSkippedSubagentOutput(output: unknown): boolean {
  return SKIPPED_STATUSES.has(readString(output, "status") ?? "");
}

/** The one-line outcome shown under a finished subagent. */
export function getChatSubagentResult(
  agentName: string,
  output: unknown
): ChatSubagentResult | null {
  const status = readString(output, "status");
  if (status && SKIPPED_STATUSES.has(status)) {
    return { kind: "skipped", reason: readString(output, "reason") };
  }
  if (agentName === "code-researcher" && status === "found") {
    const feature = readString(output, "feature");
    return feature ? { kind: "brief", feature } : null;
  }
  if (status === "created") {
    const posts = (output as { posts?: unknown[] }).posts;
    return { kind: "draft", title: readString(posts?.[0], "title") };
  }
  return null;
}
