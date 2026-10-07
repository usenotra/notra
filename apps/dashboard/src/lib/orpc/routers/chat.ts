import {
  deleteChatSession,
  getChatProjectId,
  listChatSessions,
  renameChatSession,
  setChatSessionPinned,
} from "@notra/ai/chat/history";
import { maybeGenerateCollectionTitle } from "@notra/ai/jobs/collection-title";
import { supportsPostSlug } from "@notra/ai/schemas/post";
import { sanitizeMarkdownHtml } from "@notra/ai/utils/sanitize";
import { db } from "@notra/db/drizzle";
import { postCollections, posts } from "@notra/db/schema";
import {
  buildPostCollectionName,
  isLegacyPostCollectionName,
} from "@notra/db/utils/post-collections";
import {
  chatSessionInputSchema,
  createChatPostInputSchema,
  listChatSessionsInputSchema,
  updateChatSessionInputSchema,
} from "@notra/schemas/dashboard/chat";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { marked } from "marked";
import { nanoid } from "nanoid";

import { assertOrganizationAccess } from "@/lib/auth/organization";
import { loadChatHistoryPayload } from "@/lib/chat/history";
import { afterResponse } from "@/lib/framework/after-response";
import { authorizedProcedure } from "@/lib/orpc/base";
import { internalServerError, notFound } from "@/lib/orpc/utils/errors";

const CHAT_NOT_FOUND_MESSAGE = "Chat not found";

export const chatRouter = {
  sessions: {
    list: authorizedProcedure
      .input(listChatSessionsInputSchema)
      .handler(async ({ context, input }) => {
        const { organizationId } = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        });

        const sessions = await listChatSessions(organizationId, {
          projectId: input.projectId ?? null,
        });
        return { sessions };
      }),

    get: authorizedProcedure
      .input(chatSessionInputSchema)
      .handler(async ({ context, input }) => {
        const { organizationId } = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        });

        const history = await loadChatHistoryPayload(
          organizationId,
          input.chatId
        );
        if (!history) {
          throw notFound(CHAT_NOT_FOUND_MESSAGE);
        }
        return history;
      }),

    update: authorizedProcedure
      .input(updateChatSessionInputSchema)
      .handler(async ({ context, input }) => {
        const { organizationId } = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        });

        const session =
          input.title !== undefined
            ? await renameChatSession(organizationId, input.chatId, input.title)
            : await setChatSessionPinned(
                organizationId,
                input.chatId,
                input.pinned ?? false
              );

        if (!session) {
          throw notFound(CHAT_NOT_FOUND_MESSAGE);
        }
        return { session };
      }),

    delete: authorizedProcedure
      .input(chatSessionInputSchema)
      .handler(async ({ context, input }) => {
        const { organizationId } = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        });

        const deleted = await deleteChatSession(organizationId, input.chatId);
        if (!deleted) {
          throw notFound(CHAT_NOT_FOUND_MESSAGE);
        }
        return { ok: true as const };
      }),
  },

  posts: {
    create: authorizedProcedure
      .input(createChatPostInputSchema)
      .handler(async ({ context, input }) => {
        const { organizationId } = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        });

        const { chatId, toolCallId, title, contentType, markdown, status } =
          input;
        const slug =
          supportsPostSlug(contentType) && input.slug ? input.slug : null;
        const content = sanitizeMarkdownHtml(await marked.parse(markdown));
        const id = nanoid();
        const collectionId = nanoid();
        const now = new Date();
        const contentTypesJson = JSON.stringify([contentType]);
        const projectId = await getChatProjectId(organizationId, chatId);
        const result = await db.transaction(async (tx) => {
          const [collection] = await tx
            .insert(postCollections)
            .values({
              id: collectionId,
              organizationId,
              projectId,
              source: "chat",
              sourceId: chatId,
              name: buildPostCollectionName([contentType], now),
              nameSource: "generated",
              contentTypes: [contentType],
              expectedPostCount: null,
              completedPostCount: 0,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [
                postCollections.organizationId,
                postCollections.source,
                postCollections.sourceId,
              ],
              targetWhere: and(
                eq(postCollections.source, "chat"),
                isNotNull(postCollections.sourceId)
              ),
              set: {
                projectId,
                contentTypes: sql`CASE
                  WHEN ${postCollections.contentTypes} @> ${contentTypesJson}::jsonb
                    THEN ${postCollections.contentTypes}
                  ELSE ${postCollections.contentTypes} || ${contentTypesJson}::jsonb
                END`,
                updatedAt: now,
              },
            })
            .returning({
              id: postCollections.id,
              contentTypes: postCollections.contentTypes,
              createdAt: postCollections.createdAt,
              name: postCollections.name,
              nameSource: postCollections.nameSource,
            });

          if (!collection) {
            return null;
          }

          if (toolCallId) {
            const [existing] = await tx
              .select({ postId: posts.id, status: posts.status })
              .from(posts)
              .where(
                and(
                  eq(posts.organizationId, organizationId),
                  eq(posts.collectionId, collection.id),
                  eq(sql`${posts.sourceMetadata}->>'toolCallId'`, toolCallId)
                )
              )
              .limit(1);
            if (existing) {
              return { ...existing, collectionId: collection.id };
            }
          }

          if (
            collection.nameSource === "generated" &&
            isLegacyPostCollectionName(collection.name)
          ) {
            await tx
              .update(postCollections)
              .set({
                name: buildPostCollectionName(
                  Array.isArray(collection.contentTypes)
                    ? collection.contentTypes
                    : [contentType],
                  collection.createdAt
                ),
                updatedAt: now,
              })
              .where(eq(postCollections.id, collection.id));
          }

          await tx.insert(posts).values({
            id,
            organizationId,
            collectionId: collection.id,
            title,
            slug,
            content,
            markdown,
            contentType,
            status,
            publishedAt: status === "published" ? new Date() : null,
            sourceMetadata: { chatId, ...(toolCallId ? { toolCallId } : {}) },
          });

          return { postId: id, collectionId: collection.id, status };
        });

        if (!result) {
          throw internalServerError("Failed to create chat collection");
        }

        afterResponse(async () => {
          await maybeGenerateCollectionTitle({
            collectionId: result.collectionId,
            organizationId,
          });
        });

        return { postId: result.postId, status: result.status };
      }),
  },
};
