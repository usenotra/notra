"use client";

import { DiscussionComposer } from "@/components/comments/discussion-composer";
import { DiscussionList } from "@/components/comments/discussion-list";
import { useDiscussion } from "@/lib/hooks/use-discussion";
import type { CommentTarget, DiscussionFeedProps } from "@/types/comments";

function DiscussionFeed({
  isPending,
  isError,
  items,
  currentUserId,
  busy,
  onRetry,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: DiscussionFeedProps) {
  if (isPending) {
    return (
      <p className="sr-only" role="status">
        Loading comments
      </p>
    );
  }
  if (isError) {
    return (
      <p className="text-muted-foreground py-2 text-sm" role="alert">
        Could not load comments.{" "}
        <button
          className="text-foreground underline-offset-4 hover:underline"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      </p>
    );
  }
  if (!items.length) {
    return null;
  }
  return (
    <DiscussionList
      items={items}
      currentUserId={currentUserId}
      busy={busy}
      onReply={onReply}
      onEdit={onEdit}
      onDelete={onDelete}
      onReact={onReact}
    />
  );
}

export function Discussion(target: CommentTarget) {
  const {
    query,
    items,
    user,
    busy,
    draft,
    setDraft,
    reply,
    setReply,
    section,
    textarea,
    submit,
    editComment,
    deleteComment,
    reactToComment,
  } = useDiscussion(target);

  return (
    <section
      ref={section}
      className="w-full border-t pt-6"
      aria-label="Comments"
    >
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="text-sm font-medium">Comments</h3>
        {items.length ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {items.filter((item) => !item.deletedAt).length}
          </span>
        ) : null}
      </div>
      <DiscussionFeed
        isPending={query.isPending}
        isError={query.isError}
        items={items}
        currentUserId={user?.id ?? ""}
        busy={busy}
        onRetry={() => {
          void query.refetch();
        }}
        onReply={(item) => {
          setReply(item);
          textarea.current?.focus();
        }}
        onEdit={editComment}
        onDelete={deleteComment}
        onReact={reactToComment}
      />
      <DiscussionComposer
        draft={draft}
        reply={reply}
        busy={busy}
        canSubmit={Boolean(draft.trim() && user && !busy)}
        textarea={textarea}
        onDraftChange={setDraft}
        onSubmit={submit}
        onCancelReply={() => {
          setReply(null);
          textarea.current?.focus();
        }}
      />
    </section>
  );
}
