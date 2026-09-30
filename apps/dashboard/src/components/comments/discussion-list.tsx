"use client";

import { CommentItem } from "@/components/comments/comment-item";
import type { DiscussionListProps } from "@/types/comments";

export function DiscussionList({
  items,
  currentUserId,
  busy,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: DiscussionListProps) {
  return (
    <ol className="space-y-1 pb-3">
      {items
        .filter((comment) => !comment.parentId)
        .map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            comments={items}
            currentUserId={currentUserId}
            busy={busy}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onReact={onReact}
          />
        ))}
    </ol>
  );
}
