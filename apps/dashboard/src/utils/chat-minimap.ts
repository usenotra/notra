import type { UIMessage } from "ai";

import type { ChatMinimapTurn } from "@/types/chat-minimap";

const MARKDOWN_SYNTAX_REGEX = /[#*_`>~[\]]+|\(https?:\/\/[^)]*\)/g;
const WHITESPACE_REGEX = /\s+/g;
const MAX_DESCRIPTION_LENGTH = 200;

// Earlier messages keep their identity while a reply streams, so only the
// streaming message is re-parsed on each update.
const titleCache = new WeakMap<UIMessage, string>();
const descriptionCache = new WeakMap<UIMessage, string>();

function toPlainText(text: string) {
  return text
    .replace(MARKDOWN_SYNTAX_REGEX, " ")
    .replace(WHITESPACE_REGEX, " ")
    .trim();
}

function getTitle<TMessage extends UIMessage>(
  message: TMessage,
  getUserTitle: (message: TMessage) => string
) {
  let title = titleCache.get(message);
  if (title === undefined) {
    title = toPlainText(getUserTitle(message));
    titleCache.set(message, title);
  }
  return title;
}

function getDescription(message: UIMessage) {
  let description = descriptionCache.get(message);
  if (description === undefined) {
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ");
    description = toPlainText(text).slice(0, MAX_DESCRIPTION_LENGTH);
    descriptionCache.set(message, description);
  }
  return description;
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
        title: getTitle(message, getUserTitle),
      });
      continue;
    }

    const turn = turns.at(-1);
    if (!turn) {
      continue;
    }
    turn.messageIds.push(message.id);
    turn.description ||= getDescription(message) || undefined;
  }

  return turns;
}
