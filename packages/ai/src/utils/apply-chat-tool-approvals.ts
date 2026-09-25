import type { ChatToolApprovalResponse } from "@notra/ai/types/chat";
import { isToolUIPart, type UIMessage } from "ai";

export function applyChatToolApprovals(
  messages: UIMessage[],
  responses: ChatToolApprovalResponse[],
  continuationId: string
): UIMessage[] {
  const last = messages.at(-1);
  if (last?.role !== "assistant") {
    throw new Error("The latest message has no pending tool approvals");
  }
  const pendingIds = last.parts.flatMap((part) =>
    isToolUIPart(part) && part.state === "approval-requested"
      ? [part.approval.id]
      : []
  );
  const byId = new Map(responses.map((response) => [response.id, response]));
  if (
    !pendingIds.length ||
    byId.size !== responses.length ||
    byId.size !== pendingIds.length ||
    pendingIds.some((id) => !byId.has(id))
  ) {
    throw new Error(
      "Provide one response for each pending tool approval in the latest message"
    );
  }
  const updated: UIMessage = {
    ...last,
    // Advancing the stored id lets the history compare-and-swap consume this
    // approval batch once, even when the Redis stream lock is unavailable.
    id: continuationId,
    parts: last.parts.map((part) => {
      if (!isToolUIPart(part) || part.state !== "approval-requested") {
        return part;
      }
      const response = byId.get(part.approval.id);
      if (!response) {
        throw new Error("Missing tool approval response");
      }
      return {
        ...part,
        state: "approval-responded",
        approval: {
          ...part.approval,
          approved: response.approved,
          reason: response.reason,
        },
      };
    }),
  };
  return [...messages.slice(0, -1), updated];
}
