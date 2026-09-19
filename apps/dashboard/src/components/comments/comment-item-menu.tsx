"use client";

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@notra/ui/components/ui/context-menu";
import { toast } from "sonner";

import { COMMENT_REACTIONS } from "@/constants/comments";
import type { CommentItemMenuProps } from "@/types/comments";

export function CommentItemMenu({
  comment,
  currentUserId,
  disabled,
  onReply,
  onReact,
  onStartEdit,
  onDelete,
}: CommentItemMenuProps) {
  return (
    <ContextMenuContent>
      {comment.depth < 5 ? (
        <ContextMenuItem disabled={disabled} onClick={() => onReply(comment)}>
          Reply
        </ContextMenuItem>
      ) : null}
      <ContextMenuSub>
        <ContextMenuSubTrigger disabled={disabled}>
          Add reaction
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {COMMENT_REACTIONS.map(({ emoji, label }) => (
            <ContextMenuItem
              key={emoji}
              onClick={() =>
                onReact(
                  comment.id,
                  emoji,
                  !comment.reactions.some(
                    (reaction) =>
                      reaction.emoji === emoji &&
                      reaction.userId === currentUserId
                  )
                )
              }
            >
              {emoji} {label}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem
        onClick={() => {
          void navigator.clipboard
            .writeText(comment.body)
            .catch(() => toast.error("Could not copy comment"));
        }}
      >
        Copy text
      </ContextMenuItem>
      {comment.userId === currentUserId ? (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem disabled={disabled} onClick={onStartEdit}>
            Edit
          </ContextMenuItem>
          <ContextMenuItem
            disabled={disabled}
            variant="destructive"
            onClick={() => {
              void onDelete(comment.id);
            }}
          >
            Delete
          </ContextMenuItem>
        </>
      ) : null}
    </ContextMenuContent>
  );
}
