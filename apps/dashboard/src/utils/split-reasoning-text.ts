import { REASONING_TITLE_MAX_LENGTH } from "@/constants/chat-activity";

const MARKDOWN_FIRST_LINE = /^(#{1,6}\s|[-*+]\s|\d+\.\s|```|>\s|\|)/;

export function splitReasoningText(text: string): {
  title: string;
  body: string;
} {
  const trimmed = text.trim();
  const newline = trimmed.indexOf("\n");
  const firstLine = (
    newline === -1 ? trimmed : trimmed.slice(0, newline)
  ).trim();
  const rest = newline === -1 ? "" : trimmed.slice(newline + 1).trim();
  const truncated = firstLine.length > REASONING_TITLE_MAX_LENGTH;
  const title = truncated
    ? `${firstLine.slice(0, REASONING_TITLE_MAX_LENGTH - 1)}…`
    : firstLine;

  if (!rest && !truncated) {
    return { title, body: "" };
  }

  if (
    truncated ||
    MARKDOWN_FIRST_LINE.test(firstLine) ||
    firstLine.includes("`")
  ) {
    return { title, body: trimmed };
  }

  return { title, body: rest };
}
