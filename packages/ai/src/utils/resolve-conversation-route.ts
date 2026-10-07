import { conversationSelectionSchema } from "@notra/ai/schemas/chat";
import type { RoutingResult } from "@notra/ai/types/orchestration";
import type { UIMessage } from "ai";

export async function resolveConversationRoute(
  messages: UIMessage[],
  requestedModel: string | undefined,
  route: () => Promise<RoutingResult>
): Promise<RoutingResult> {
  if (requestedModel && requestedModel !== "auto") {
    return {
      model: requestedModel,
      complexity: "complex",
      requiresTools: true,
      reasoning: "User selected model explicitly",
    };
  }

  const selection = getConversationSelection(messages);
  if (selection) {
    return {
      ...selection,
      complexity:
        selection.thinkingLevel === "high" ||
        selection.thinkingLevel === "medium"
          ? "complex"
          : "simple",
      requiresTools: true,
      reasoning: "Keeping the conversation's previous model and thinking level",
    };
  }

  return route();
}

function getConversationSelection(messages: UIMessage[]) {
  for (const message of messages.toReversed()) {
    if (
      message.role !== "assistant" ||
      !message.metadata ||
      typeof message.metadata !== "object"
    ) {
      continue;
    }
    const parsed = conversationSelectionSchema.safeParse(message.metadata);
    if (parsed.success) {
      return parsed.data;
    }
  }
  const metadata = messages[0]?.metadata;
  const saved = conversationSelectionSchema.safeParse(
    metadata &&
      typeof metadata === "object" &&
      "conversationSelection" in metadata
      ? metadata.conversationSelection
      : undefined
  );
  return saved.success ? saved.data : undefined;
}

// Keep a server-saved selection when retry/edit truncates the assistant history.
// The first message survives truncation, including a retry of the first turn.
export function preserveConversationSelection(
  messages: UIMessage[],
  savedMessages: UIMessage[]
): UIMessage[] {
  const selection = getConversationSelection(savedMessages);
  return messages.map((message, index) =>
    index === 0
      ? {
          ...message,
          metadata: {
            ...(message.metadata && typeof message.metadata === "object"
              ? message.metadata
              : {}),
            conversationSelection: selection,
          },
        }
      : message
  );
}
