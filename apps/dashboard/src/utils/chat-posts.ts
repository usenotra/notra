import { createdPostToolOutputSchema } from "@notra/ai/schemas/post";
import type { ChatUIMessage } from "@notra/ai/types/chat";
import { isToolUIPart } from "ai";

import {
  CHAT_CREATE_TOOL_TYPES,
  POST_REFERENCE_PREFIX,
  POST_REFERENCE_VALUE_PATTERN,
} from "@/constants/chat-posts";
import type { ChatPostEntry, ChatPostState } from "@/types/chat-posts";
import type { CreateToolContentType } from "@/types/components/chat-page";

export function getCreateToolContentType(
  type: string
): CreateToolContentType | null {
  return type in CHAT_CREATE_TOOL_TYPES
    ? CHAT_CREATE_TOOL_TYPES[type as keyof typeof CHAT_CREATE_TOOL_TYPES]
    : null;
}

/**
 * Collects the posts created in a chat from its create-tool parts. Discarded,
 * denied, and failed drafts are left out; one post saved twice keeps its
 * first position.
 */
export function getChatPosts(messages: readonly ChatUIMessage[]) {
  const entries: ChatPostEntry[] = [];
  const seenPostIds = new Set<string>();
  const entriesByPostId = new Map<string, ChatPostEntry>();

  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }
    for (const part of message.parts) {
      if (!isToolUIPart(part) || part.type === "dynamic-tool") {
        continue;
      }
      if (part.type === "tool-updatePost") {
        applyPostUpdate(entriesByPostId, part);
        continue;
      }
      const contentType = getCreateToolContentType(part.type);
      if (!contentType) {
        continue;
      }
      const state = getChatPostState(part);
      if (!state) {
        continue;
      }
      const output = createdPostToolOutputSchema.safeParse(part.output);
      const postId = output.success ? output.data.postId : null;
      if (postId) {
        if (seenPostIds.has(postId)) {
          continue;
        }
        seenPostIds.add(postId);
      }
      const input = part.input as
        | { title?: string; markdown?: string }
        | undefined;
      const entry: ChatPostEntry = {
        toolCallId: part.toolCallId,
        postId,
        title: input?.title ?? "",
        markdown: input?.markdown ?? "",
        contentType,
        state: postId ? "saved" : state,
      };
      entries.push(entry);
      if (postId) {
        entriesByPostId.set(postId, entry);
      }
    }
  }

  return entries;
}

// A later updatePost renames or rewrites the post; tabs and the @ menu follow.
function applyPostUpdate(
  entriesByPostId: Map<string, ChatPostEntry>,
  part: Extract<ChatUIMessage["parts"][number], { toolCallId: string }>
) {
  if (part.state !== "output-available") {
    return;
  }
  const output = part.output as
    | { postId?: string; status?: string }
    | undefined;
  const entry = output?.postId ? entriesByPostId.get(output.postId) : undefined;
  if (!entry || output?.status !== "updated") {
    return;
  }
  const input = part.input as { title?: string; markdown?: string } | undefined;
  if (input?.title) {
    entry.title = input.title;
  }
  if (input?.markdown) {
    entry.markdown = input.markdown;
  }
}

function getChatPostState(
  part: Extract<ChatUIMessage["parts"][number], { toolCallId: string }>
): ChatPostState | null {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return "writing";
  }
  if (part.state === "output-error" || part.state === "output-denied") {
    return null;
  }
  const reason = part.approval?.reason;
  if (reason === "manual-draft" || reason === "manual-published") {
    return "saved";
  }
  if (part.approval?.approved === false) {
    return null;
  }
  return part.state === "output-available" ? "saved" : "unsaved";
}

export function getPostReferenceValue(postId: string) {
  return `${POST_REFERENCE_PREFIX}${postId}`;
}

export function parsePostReferenceValue(value: string): string | null {
  return value.trim().match(POST_REFERENCE_VALUE_PATTERN)?.[1] ?? null;
}
