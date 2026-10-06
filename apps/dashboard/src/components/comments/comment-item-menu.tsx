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
import { useTranslations } from "use-intl";

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
  const t = useTranslations("comments");
  const tCommon = useTranslations("common.actions");
  return (
    <ContextMenuContent>
      {comment.depth < 5 ? (
        <ContextMenuItem disabled={disabled} onClick={() => onReply(comment)}>
          {t("reply")}
        </ContextMenuItem>
      ) : null}
      <ContextMenuSub>
        <ContextMenuSubTrigger disabled={disabled}>
          {t("addReaction")}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {COMMENT_REACTIONS.map(({ emoji, key }) => (
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
              {emoji} {t(`reactions.${key}`)}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem
        onClick={() => {
          void navigator.clipboard
            .writeText(comment.body)
            .catch(() => toast.error(t("copyFailed")));
        }}
      >
        {t("copyText")}
      </ContextMenuItem>
      {comment.userId === currentUserId ? (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem disabled={disabled} onClick={onStartEdit}>
            {tCommon("edit")}
          </ContextMenuItem>
          <ContextMenuItem
            disabled={disabled}
            variant="destructive"
            onClick={() => {
              void onDelete(comment.id);
            }}
          >
            {tCommon("delete")}
          </ContextMenuItem>
        </>
      ) : null}
    </ContextMenuContent>
  );
}
