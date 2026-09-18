import { realtime } from "@notra/ai/realtime";
import { db } from "@notra/db/drizzle";
import {
  agentFeedback,
  geoShelfSources,
  discussionComments,
  discussionReactions,
  users,
} from "@notra/db/schema";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { assertOrganizationAccess } from "@/lib/auth/organization";
import { authorizedProcedure } from "@/lib/orpc/base";
import { badRequest, notFound } from "@/lib/orpc/utils/errors";
import { publishCommentChange } from "@/lib/realtime/comments";
import {
  commentTargetSchema,
  createCommentSchema,
  changeCommentSchema,
  reactCommentSchema,
} from "@/schemas/comments";
import type { AuthenticatedUser } from "@/types/auth/organization";
import type { CommentTarget, DiscussionComment } from "@/types/comments";
import { assertCommentAuthor, replyDepth } from "@/utils/comment-permissions";

function targetWhere(input: CommentTarget) {
  return and(
    eq(discussionComments.organizationId, input.organizationId),
    input.targetType === "feedback"
      ? eq(discussionComments.feedbackId, input.targetId)
      : eq(discussionComments.shelfSourceId, input.targetId)
  );
}

async function assertDiscussionAccess(
  context: { headers: Headers; user: AuthenticatedUser },
  input: CommentTarget
) {
  await assertOrganizationAccess({
    headers: context.headers,
    organizationId: input.organizationId,
    user: context.user,
  });
  const table =
    input.targetType === "feedback" ? agentFeedback : geoShelfSources;
  const [target] = await db
    .select({ id: table.id })
    .from(table)
    .where(
      and(
        eq(table.id, input.targetId),
        eq(table.organizationId, input.organizationId)
      )
    )
    .limit(1);
  if (!target) {
    throw notFound("Discussion not found");
  }
}

async function findComment(input: CommentTarget & { commentId: string }) {
  const [comment] = await db
    .select()
    .from(discussionComments)
    .where(and(targetWhere(input), eq(discussionComments.id, input.commentId)))
    .limit(1);
  if (!comment) {
    throw notFound("Comment not found");
  }
  return comment;
}

export const commentsRouter = {
  list: authorizedProcedure
    .input(commentTargetSchema)
    .handler(async ({ context, input }) => {
      await assertDiscussionAccess(context, input);
      const rows = await db
        .select({
          comment: discussionComments,
          name: users.name,
          image: users.image,
        })
        .from(discussionComments)
        .leftJoin(users, eq(users.id, discussionComments.userId))
        .where(targetWhere(input))
        .orderBy(asc(discussionComments.createdAt), asc(discussionComments.id));
      const reactions = rows.length
        ? await db
            .select()
            .from(discussionReactions)
            .where(
              inArray(
                discussionReactions.commentId,
                rows.map(({ comment }) => comment.id)
              )
            )
        : [];
      const items: DiscussionComment[] = rows.map(
        ({ comment, name, image }) => ({
          ...comment,
          name: name ?? "Former member",
          image,
          createdAt: comment.createdAt.toISOString(),
          editedAt: comment.editedAt?.toISOString() ?? null,
          deletedAt: comment.deletedAt?.toISOString() ?? null,
          reactions: reactions
            .filter((reaction) => reaction.commentId === comment.id)
            .map(({ emoji, userId }) => ({ emoji, userId })),
        })
      );
      return {
        items,
        realtimeEnabled: Boolean(realtime),
        currentUser: {
          id: context.user.id,
          name: context.user.name,
          image: context.user.image ?? null,
        },
      };
    }),
  create: authorizedProcedure
    .input(createCommentSchema)
    .handler(async ({ context, input }) => {
      await assertDiscussionAccess(context, input);
      const parent = input.parentId
        ? await findComment({ ...input, commentId: input.parentId })
        : null;
      const depth = replyDepth(parent);
      await db
        .insert(discussionComments)
        .values({
          id: input.id,
          organizationId: input.organizationId,
          feedbackId: input.targetType === "feedback" ? input.targetId : null,
          shelfSourceId: input.targetType === "shelf" ? input.targetId : null,
          parentId: input.parentId,
          depth,
          userId: context.user.id,
          body: input.body,
        })
        .onConflictDoNothing();
      await publishCommentChange(input);
      return { id: input.id };
    }),
  edit: authorizedProcedure
    .input(changeCommentSchema)
    .handler(async ({ context, input }) => {
      await assertDiscussionAccess(context, input);
      const comment = await findComment(input);
      assertCommentAuthor(comment.userId, context.user.id);
      if (!input.body || comment.deletedAt) {
        throw badRequest("This comment cannot be edited");
      }
      await db
        .update(discussionComments)
        .set({ body: input.body, editedAt: new Date() })
        .where(
          and(
            eq(discussionComments.id, comment.id),
            isNull(discussionComments.deletedAt)
          )
        );
      await publishCommentChange(input);
      return { success: true };
    }),
  delete: authorizedProcedure
    .input(changeCommentSchema)
    .handler(async ({ context, input }) => {
      await assertDiscussionAccess(context, input);
      const comment = await findComment(input);
      assertCommentAuthor(comment.userId, context.user.id);
      await db
        .update(discussionComments)
        .set({ body: "", deletedAt: new Date() })
        .where(eq(discussionComments.id, comment.id));
      await publishCommentChange(input);
      return { success: true };
    }),
  react: authorizedProcedure
    .input(reactCommentSchema)
    .handler(async ({ context, input }) => {
      await assertDiscussionAccess(context, input);
      const comment = await findComment(input);
      if (comment.deletedAt) {
        throw badRequest("This comment was deleted");
      }
      if (input.active) {
        await db
          .insert(discussionReactions)
          .values({
            id: crypto.randomUUID(),
            commentId: comment.id,
            userId: context.user.id,
            emoji: input.emoji,
          })
          .onConflictDoNothing();
      } else {
        await db
          .delete(discussionReactions)
          .where(
            and(
              eq(discussionReactions.commentId, comment.id),
              eq(discussionReactions.userId, context.user.id),
              eq(discussionReactions.emoji, input.emoji)
            )
          );
      }
      await publishCommentChange(input);
      return { success: true };
    }),
};
