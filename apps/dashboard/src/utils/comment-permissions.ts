import { badRequest, forbidden } from "@/lib/orpc/utils/errors";

export function replyDepth(
  parent: { depth: number; deletedAt: Date | null } | null
) {
  if (!parent) {
    return 0;
  }
  if (parent.depth >= 5 || parent.deletedAt) {
    throw badRequest(
      "Replies are limited to five levels and cannot target deleted comments"
    );
  }
  return parent.depth + 1;
}

export function assertCommentAuthor(authorId: string | null, userId: string) {
  if (authorId !== userId) {
    throw forbidden("You can only change your own comments");
  }
}
