import {
  CHAT_ANNOTATION_ITEM_REGEX,
  CHAT_ANNOTATION_NOTE_REGEX,
  CHAT_ANNOTATION_PASSAGE_REGEX,
  CHAT_ANNOTATIONS_BLOCK_REGEX,
} from "@/constants/chat-annotations";
import type {
  ChatAnnotation,
  ParsedChatAnnotations,
} from "@/types/chat-annotations";
import { getPostReferenceValue } from "@/utils/chat-posts";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};
const ESCAPE_REGEX = /[&<>"]/g;
const UNESCAPE_REGEX = /&(amp|lt|gt|quot);/g;
const UNESCAPES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
};
const LINE_BREAK_REGEX = /\r?\n/;
const POST_TOKEN_REGEX = /@post\/([A-Za-z0-9_-]+)/g;

function escapeText(value: string) {
  return value.replace(ESCAPE_REGEX, (char) => ESCAPES[char] ?? char);
}

function unescapeText(value: string) {
  return value.replace(
    UNESCAPE_REGEX,
    (match, name: string) => UNESCAPES[name] ?? match
  );
}

/**
 * Serializes annotations as a block the agent reads before the message:
 * numbered so the user can refer to them, with the post token and the exact
 * passage it can locate in the post.
 */
function serializeChatAnnotations(annotations: readonly ChatAnnotation[]) {
  const items = annotations.map((annotation, index) => {
    const note = annotation.note
      ? `\n<note>${escapeText(annotation.note)}</note>`
      : "";
    return `<annotation n="${index + 1}" post="${getPostReferenceValue(annotation.postId)}" title="${escapeText(annotation.title)}">\n<passage>${escapeText(annotation.text)}</passage>${note}\n</annotation>`;
  });
  return `<annotations>\n${items.join("\n")}\n</annotations>`;
}

/** Everything the composer sends ahead of the typed text, or null. */
export function buildComposerPrefix(
  quote: string | null | undefined,
  annotations: readonly ChatAnnotation[]
): string | null {
  const parts: string[] = [];
  if (annotations.length > 0) {
    parts.push(serializeChatAnnotations(annotations));
  }
  if (quote) {
    parts.push(
      quote
        .split(LINE_BREAK_REGEX)
        .map((line) => `> ${line}`)
        .join("\n")
    );
  }
  return parts.length > 0 ? parts.join("\n\n") : null;
}

export function prependComposerPrefix(
  text: string,
  prefix: string | null | undefined
): string {
  return prefix ? `${prefix}\n\n${text}` : text;
}

export function parseChatAnnotations(
  text: string
): ParsedChatAnnotations | null {
  const block = text.match(CHAT_ANNOTATIONS_BLOCK_REGEX);
  if (!block) {
    return null;
  }
  const annotations = Array.from(
    block[1]?.matchAll(CHAT_ANNOTATION_ITEM_REGEX) ?? [],
    ([, postId = "", title = "", body = ""]) => {
      // Older messages hold the bare passage without passage/note tags.
      const passage = body.match(CHAT_ANNOTATION_PASSAGE_REGEX)?.[1] ?? body;
      const note = body.match(CHAT_ANNOTATION_NOTE_REGEX)?.[1];
      return {
        postId,
        title: unescapeText(title),
        text: unescapeText(passage.trim()),
        note: note ? unescapeText(note) : undefined,
      };
    }
  );
  return { annotations, rest: text.slice(block[0].length) };
}

/**
 * Re-applies what an edited message lost in the plain-text editor: the
 * annotations block and `@post/<id>` tokens shown as `@Title`.
 */
export function restoreChatReferences(
  originalText: string,
  editedText: string,
  postTitlesById: ReadonlyMap<string, string>
): string {
  let text = editedText;
  for (const [, postId = ""] of originalText.matchAll(POST_TOKEN_REGEX)) {
    const title = postTitlesById.get(postId);
    if (title) {
      text = text.replace(`@${title}`, getPostReferenceValue(postId));
    }
  }
  const block = originalText.match(CHAT_ANNOTATIONS_BLOCK_REGEX)?.[0];
  return block ? `${block.trimEnd()}\n\n${text}` : text;
}

/**
 * Readable one-line text for a serialized message: the annotations block
 * becomes a count and `@post/<id>` tokens become `@Title`.
 */
export function toChatDisplayLabel(
  text: string,
  postTitlesById: ReadonlyMap<string, string>,
  annotationsLabel: (count: number) => string
): string {
  const parsed = parseChatAnnotations(text);
  const body = (parsed ? parsed.rest : text).replace(
    POST_TOKEN_REGEX,
    (token, postId: string) => {
      const title = postTitlesById.get(postId);
      return title ? `@${title}` : token;
    }
  );
  if (!parsed) {
    return body;
  }
  const count = annotationsLabel(parsed.annotations.length);
  return body.trim() ? `${count} · ${body.trim()}` : count;
}
