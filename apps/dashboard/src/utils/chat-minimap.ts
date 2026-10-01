import type { UIMessage } from "ai";

import type { ChatMinimapTurn } from "@/types/chat-minimap";

const MARKDOWN_SYNTAX_REGEX = /[#*_`>~[\]]+|\(https?:\/\/[^)]*\)/g;
const WHITESPACE_REGEX = /\s+/g;
const MAX_DESCRIPTION_LENGTH = 200;

function toPlainText(text: string) {
  return text
    .replace(MARKDOWN_SYNTAX_REGEX, " ")
    .replace(WHITESPACE_REGEX, " ")
    .trim();
}

function getAssistantText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ");
}

// One turn per user message; assistant replies attach to the turn before them.
export function buildChatMinimapTurns<TMessage extends UIMessage>(
  messages: TMessage[],
  getUserTitle: (message: TMessage) => string
): ChatMinimapTurn[] {
  const turns: ChatMinimapTurn[] = [];

  for (const message of messages) {
    if (message.role === "user") {
      turns.push({
        id: message.id,
        messageIds: [message.id],
        title: toPlainText(getUserTitle(message)),
      });
      continue;
    }

    const turn = turns.at(-1);
    if (!turn) {
      continue;
    }
    turn.messageIds.push(message.id);
    if (!turn.description) {
      const description = toPlainText(getAssistantText(message));
      turn.description =
        description.slice(0, MAX_DESCRIPTION_LENGTH) || undefined;
    }
  }

  return turns;
}
