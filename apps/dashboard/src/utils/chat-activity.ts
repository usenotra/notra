import { isToolUIPart, type UIMessage } from "ai";

import type { ChatActivityOptions } from "@/types/chat-activity";
import { groupAssistantMessageParts } from "@/utils/group-assistant-message-parts";

export function getChatActivity(
  messages: UIMessage[],
  isRunning: boolean,
  options: ChatActivityOptions = {}
) {
  const { includeFileParts = true } = options;
  const lastMessage = messages.at(-1);
  const isAssistant = lastMessage?.role === "assistant";
  const hasInlineActivity =
    isAssistant &&
    groupAssistantMessageParts(lastMessage.parts, options).some(
      (segment) => segment.kind === "activity"
    );
  const lastAssistantHasNoVisibleContent =
    isAssistant &&
    !lastMessage.parts.some(
      (part) =>
        (part.type === "text" && Boolean(part.text.trim())) ||
        part.type === "reasoning" ||
        (includeFileParts && part.type === "file") ||
        isToolUIPart(part)
    );
  const lastPart = lastMessage?.parts.findLast(
    (part) =>
      part.type === "step-start" ||
      (includeFileParts && part.type === "file") ||
      ((part.type === "text" || part.type === "reasoning") &&
        (Boolean(part.text.trim()) || part.state === "streaming")) ||
      isToolUIPart(part)
  );
  const hasPendingApproval = lastMessage?.parts.some(
    (part) => isToolUIPart(part) && part.state === "approval-requested"
  );
  const isAwaitingContinuation =
    isAssistant &&
    lastPart != null &&
    (lastPart.type === "step-start" ||
      (lastPart.type === "reasoning" && lastPart.state !== "streaming") ||
      (isToolUIPart(lastPart) &&
        (lastPart.state === "output-available" ||
          lastPart.state === "output-error" ||
          lastPart.state === "output-denied" ||
          lastPart.state === "approval-responded")));

  return {
    activeMessageId: isRunning && isAssistant ? lastMessage.id : null,
    hasInlineActivity,
    lastAssistantHasNoVisibleContent,
    showThinkingIndicator: Boolean(
      isRunning &&
      !hasInlineActivity &&
      !hasPendingApproval &&
      (lastMessage?.role === "user" ||
        lastAssistantHasNoVisibleContent ||
        isAwaitingContinuation)
    ),
  };
}
