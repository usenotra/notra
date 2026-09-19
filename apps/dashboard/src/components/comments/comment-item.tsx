"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "@notra/ui/components/ui/context-menu";
import { useState } from "react";

import { CommentActions } from "@/components/comments/comment-actions";
import { CommentBody } from "@/components/comments/comment-body";
import { CommentEditForm } from "@/components/comments/comment-edit-form";
import { CommentItemMenu } from "@/components/comments/comment-item-menu";
import { CommentReplies } from "@/components/comments/comment-replies";
import { CommentThreadLines } from "@/components/comments/comment-thread-lines";
import { CommentTimestamp } from "@/components/comments/comment-timestamp";
import type {
  CommentContentProps,
  CommentItemProps,
  DiscussionComment,
} from "@/types/comments";

function hasVisibleThread(
  comment: DiscussionComment,
  comments: DiscussionComment[]
): boolean {
  return (
    !comment.deletedAt ||
    comments.some(
      (item) => item.parentId === comment.id && hasVisibleThread(item, comments)
    )
  );
}

function CommentContent({
  editing,
  body,
  draft,
  disabled,
  onDraftChange,
  onCancel,
  onSave,
}: CommentContentProps) {
  if (editing) {
    return (
      <CommentEditForm
        draft={draft}
        disabled={disabled}
        onDraftChange={onDraftChange}
        onCancel={onCancel}
        onSave={onSave}
      />
    );
  }
  return <CommentBody body={body} />;
}

export function CommentItem(props: CommentItemProps) {
  const { comment, comments, busy, onEdit } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const children = comments.filter(
    (item) => item.parentId === comment.id && hasVisibleThread(item, comments)
  );
  const deleted = Boolean(comment.deletedAt);
  if (deleted && !children.length) {
    return null;
  }
  const disabled = Boolean(busy || comment.pending);
  const isLastReply =
    comments
      .filter(
        (item) =>
          item.parentId === comment.parentId && hasVisibleThread(item, comments)
      )
      .at(-1)?.id === comment.id;
  function startEdit() {
    setDraft(comment.body);
    setEditing(true);
  }
  return (
    <li className="relative min-w-0">
      <CommentThreadLines
        parentId={comment.parentId}
        isLastReply={isLastReply}
      />
      {deleted ? null : (
        <ContextMenu>
          <ContextMenuTrigger
            render={
              <article
                data-comment-id={comment.id}
                className="group/comment relative flex scroll-mb-24 gap-3 py-2"
              />
            }
          >
            {children.length ? (
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
                <CommentTimestamp createdAt={comment.createdAt} />
                {comment.editedAt ? (
                  <span className="text-muted-foreground">edited</span>
                ) : null}
                {comment.pending ? (
                  <span className="text-muted-foreground" role="status">
                    Sending…
                  </span>
                ) : null}
              </div>
              <CommentContent
                editing={editing}
                body={comment.body}
                draft={draft}
                disabled={disabled}
                onDraftChange={setDraft}
                onCancel={() => setEditing(false)}
                onSave={async () => {
                  if (await onEdit(comment.id, draft.trim())) {
                    setEditing(false);
                  }
                }}
              />
              {editing ? null : (
                <CommentActions {...props} onStartEdit={startEdit} />
              )}
            </div>
          </ContextMenuTrigger>
          {editing ? null : (
            <CommentItemMenu
              comment={comment}
              currentUserId={props.currentUserId}
              disabled={disabled}
              onReply={props.onReply}
              onReact={props.onReact}
              onStartEdit={startEdit}
              onDelete={props.onDelete}
            />
          )}
        </ContextMenu>
      )}
      <CommentReplies replies={children} itemProps={props} />
    </li>
  );
}
