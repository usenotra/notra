import { z } from "zod";

export const commentTargetSchema = z.object({
  organizationId: z.string().min(1),
  targetId: z.string().min(1),
  targetType: z.enum(["feedback", "shelf"]),
});
export const createCommentSchema = commentTargetSchema.extend({
  id: z.uuid(),
  parentId: z.string().min(1).nullable(),
  body: z.string().trim().min(1).max(10000),
});
export const changeCommentSchema = commentTargetSchema.extend({
  commentId: z.string().min(1),
  body: z.string().trim().min(1).max(10000).optional(),
});
export const reactCommentSchema = changeCommentSchema.extend({
  emoji: z.enum(["❤️", "🔥", "👍", "👎", "👀", "👑"]),
  active: z.boolean(),
});
