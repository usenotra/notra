import { getToolName, isToolUIPart, type UIMessage } from "ai";

import { createdPostToolOutputSchema } from "../schemas/post";
import type { SavedChatPost } from "../types/chat-post";
import { getCreatePostToolName, isCreatePostToolName } from "./post-tool-name";

export function linkSavedChatPosts<T extends UIMessage>(
  messages: T[],
  posts: SavedChatPost[]
): T[] {
  return messages.map((message) => {
    if (message.role !== "assistant") {
      return message;
    }
    return {
      ...message,
      parts: message.parts.map((part) => {
        if (!isToolUIPart(part) || !isCreatePostToolName(getToolName(part))) {
          return part;
        }
        const output = createdPostToolOutputSchema.safeParse(part.output);
        const input = part.input as
          | { title?: string; markdown?: string }
          | undefined;
        const manuallySaved =
          part.approval?.reason === "manual-draft" ||
          part.approval?.reason === "manual-published";
        const matches = posts.filter((post) => {
          if (getCreatePostToolName(post.contentType) !== getToolName(part)) {
            return false;
          }
          if (output.success) {
            return post.postId === output.data.postId;
          }
          if (post.toolCallId) {
            return post.toolCallId === part.toolCallId;
          }
          return manuallySaved && post.title === input?.title;
        });
        const [post] = matches;
        if (!post || matches.length !== 1) {
          return part;
        }
        return {
          ...part,
          state: "output-available" as const,
          approval: undefined,
          input: {
            ...input,
            title: post.title,
            markdown: post.markdown ?? input?.markdown ?? "",
          },
          output: { postId: post.postId, status: post.status },
        };
      }),
    };
  });
}
