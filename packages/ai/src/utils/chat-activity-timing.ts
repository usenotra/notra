import type { UIMessage } from "ai";

import { chatMessageMetadataSchema } from "../schemas/chat";
import type {
  ChatActivityTimingEvent,
  ChatMessageMetadata,
} from "../types/chat";

export function createChatActivityTimingTracker(previousMessage?: UIMessage) {
  const previous =
    previousMessage?.role === "assistant" ? previousMessage : undefined;
  const metadata = chatMessageMetadataSchema.safeParse(previous?.metadata);
  const timings: NonNullable<ChatMessageMetadata["activityTimings"]> = {
    ...(metadata.success ? metadata.data.activityTimings : undefined),
  };
  const reasoningKeys = new Map<string, string>();
  let reasoningIndex =
    previous?.parts.filter((part) => part.type === "reasoning").length ?? 0;

  function record(part: ChatActivityTimingEvent) {
    let key: string | undefined;
    let finished = false;
    if (part.type === "reasoning-start" && part.id) {
      key = `reasoning:${reasoningIndex++}`;
      reasoningKeys.set(part.id, key);
    } else if (part.type === "reasoning-end" && part.id) {
      key = reasoningKeys.get(part.id);
      finished = true;
    } else if (
      part.toolCallId &&
      ["tool-call", "tool-result", "tool-error", "tool-output-denied"].includes(
        part.type
      )
    ) {
      key = `tool:${part.toolCallId}`;
      finished = part.type !== "tool-call";
    } else if (part.type === "tool-input-start" && part.id) {
      key = `tool:${part.id}`;
    }
    if (!key) {
      return undefined;
    }
    const now = Date.now();
    timings[key] = {
      startedAt: timings[key]?.startedAt ?? now,
      ...(finished ? { finishedAt: now } : {}),
    };
    return { ...timings };
  }

  return { record, timings };
}
