import { db } from "@notra/db/drizzle";
import { postCollections, posts } from "@notra/db/schema";
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { and, eq, sql } from "drizzle-orm";

import { contentTypeSchema } from "../schemas/content";
import { linkSavedChatPosts } from "../utils/chat-post";
import { isCreatePostToolName } from "../utils/post-tool-name";

export async function hydrateSavedChatPosts<T extends UIMessage>(
  organizationId: string,
  chatId: string,
  messages: T[]
): Promise<T[]> {
  if (
    !messages.some(
      (message) =>
        message.role === "assistant" &&
        message.parts.some(
          (part) =>
            isToolUIPart(part) && isCreatePostToolName(getToolName(part))
        )
    )
  ) {
    return messages;
  }
  const savedPosts = await db
    .select({
      postId: posts.id,
      toolCallId: sql<string | null>`${posts.sourceMetadata}->>'toolCallId'`,
      title: posts.title,
      markdown: posts.markdown,
      contentType: posts.contentType,
      status: posts.status,
    })
    .from(posts)
    .innerJoin(postCollections, eq(posts.collectionId, postCollections.id))
    .where(
      and(
        eq(posts.organizationId, organizationId),
        eq(postCollections.organizationId, organizationId),
        eq(postCollections.source, "chat"),
        eq(postCollections.sourceId, chatId)
      )
    );
  return linkSavedChatPosts(
    messages,
    savedPosts.flatMap((post) => {
      const contentType = contentTypeSchema.safeParse(post.contentType);
      return contentType.success
        ? [{ ...post, contentType: contentType.data }]
        : [];
    })
  );
}
