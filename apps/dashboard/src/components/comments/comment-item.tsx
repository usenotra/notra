"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@notra/ui/components/ui/context-menu";
import { Textarea } from "@notra/ui/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { CommentActions } from "@/components/comments/comment-actions";
import { CommentBody } from "@/components/comments/comment-body";
import { COMMENT_REACTIONS } from "@/constants/comments";
import type { CommentItemProps } from "@/types/comments";
import { formatRelative } from "@/utils/format-relative";

export function CommentItem(props: CommentItemProps) {
  const { comment, comments, busy, onEdit } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const children = comments.filter((item) => item.parentId === comment.id);
  const [collapsedAtCount, setCollapsedAtCount] = useState<number | null>(
    children.length
  );
  const repliesOpen = collapsedAtCount !== children.length;
  const repliesId = useId();
  const disabled = busy || comment.pending;
  const isLastReply =
    comments.filter((item) => item.parentId === comment.parentId).at(-1)?.id ===
    comment.id;
  function startEdit() {
    setDraft(comment.body);
    setEditing(true);
  }
  return (
    <li className="relative min-w-0">
      {comment.parentId ? (
        <>
          <svg
            aria-hidden="true"
            className="text-border/70 pointer-events-none absolute top-0 -left-5 h-6 w-4 overflow-visible"
            width="16"
            height="24"
            viewBox="0 0 16 24"
            fill="none"
          >
            <path
              d={
                isLastReply
                  ? "M0.5 0V16C0.5 20.142 3.858 23.5 8 23.5H16"
                  : "M0.5 0V24M0.5 16C0.5 20.142 3.858 23.5 8 23.5H16"
              }
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
          {!isLastReply ? (
            <span
              aria-hidden="true"
              className="border-border/70 pointer-events-none absolute top-6 bottom-0 -left-5 border-l"
            />
          ) : null}
        </>
      ) : null}
      <ContextMenu>
        <ContextMenuTrigger
          render={
            <article
              data-comment-id={comment.id}
              className="group/comment relative flex scroll-mb-24 gap-3 py-2"
            />
          }
        >
          {children.length && repliesOpen ? (
            <span
              aria-hidden="true"
              className="border-border/70 pointer-events-none absolute top-11 bottom-0 left-4 border-l"
            />
          ) : null}
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={comment.image ?? undefined} />
            <AvatarFallback className="text-muted-foreground text-[11px]">
              {comment.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-24 text-sm leading-5">
              <span className="text-foreground text-sm font-medium">
                {comment.name}
              </span>
              <Tooltip>
                <TooltipTrigger className="text-muted-foreground focus-visible:ring-ring/50 rounded-sm leading-5 outline-none focus-visible:ring-2">
                  <time dateTime={comment.createdAt}>
                    {formatRelative(comment.createdAt)}
                  </time>
                </TooltipTrigger>
                <TooltipContent>
                  {new Date(comment.createdAt).toLocaleString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    timeZoneName: "short",
                  })}
                </TooltipContent>
              </Tooltip>
              {comment.editedAt && !comment.deletedAt ? (
                <span className="text-muted-foreground">edited</span>
              ) : null}
              {comment.pending ? (
                <span className="text-muted-foreground" role="status">
                  Sending…
                </span>
              ) : null}
            </div>
            {editing ? (
              <form
                className="mt-2 space-y-2"
                action={async () => {
                  if (await onEdit(comment.id, draft.trim())) {
                    setEditing(false);
                  }
                }}
              >
                <Textarea
                  aria-label="Edit comment"
                  maxLength={10000}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    type="submit"
                    disabled={disabled || !draft.trim()}
                  >
                    Save
                  </Button>
                </div>
              </form>
            ) : comment.deletedAt ? (
              <p className="text-muted-foreground mt-1 text-sm italic">
                Comment deleted
              </p>
            ) : (
              <CommentBody body={comment.body} />
            )}
            {!comment.deletedAt && !editing ? (
              <CommentActions {...props} onStartEdit={startEdit} />
            ) : null}
          </div>
        </ContextMenuTrigger>
        {!comment.deletedAt && !editing ? (
          <ContextMenuContent>
            {comment.depth < 5 ? (
              <ContextMenuItem
                disabled={disabled}
                onClick={() => props.onReply(comment)}
              >
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
                      props.onReact(
                        comment.id,
                        emoji,
                        !comment.reactions.some(
                          (reaction) =>
                            reaction.emoji === emoji &&
                            reaction.userId === props.currentUserId
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
            {comment.userId === props.currentUserId ? (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem disabled={disabled} onClick={startEdit}>
                  Edit
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={disabled}
                  variant="destructive"
                  onClick={() => {
                    void props.onDelete(comment.id);
                  }}
                >
                  Delete
                </ContextMenuItem>
              </>
            ) : null}
          </ContextMenuContent>
        ) : null}
      </ContextMenu>
      {children.length ? (
        <div>
          <div className="relative pb-1">
            {repliesOpen ? (
              <span
                aria-hidden="true"
                className="border-border/70 pointer-events-none absolute inset-y-0 left-4 border-l"
              />
            ) : null}
            <button
              type="button"
              aria-expanded={repliesOpen}
              aria-controls={repliesId}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 ml-11 inline-flex min-h-6 items-center rounded-sm text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
              onClick={() =>
                setCollapsedAtCount(repliesOpen ? children.length : null)
              }
            >
              {repliesOpen
                ? "Hide comments"
                : `View ${children.length} ${children.length === 1 ? "comment" : "comments"}`}
            </button>
          </div>
          <ol id={repliesId} hidden={!repliesOpen} className="ml-4 pl-5">
            {children.map((child) => (
              <CommentItem {...props} comment={child} key={child.id} />
            ))}
          </ol>
        </div>
      ) : null}
    </li>
  );
}
