"use client";

import { Button } from "@/components/button";
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
      <div role="status" className="space-y-3 py-4">
        <span className="sr-only">Loading comments</span>
        <div className="bg-muted h-4 w-32 rounded motion-safe:animate-pulse" />
        <div className="bg-muted h-4 w-3/4 rounded motion-safe:animate-pulse" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="py-4 text-sm">
        Could not load comments.{" "}
        <Button size="sm" variant="ghost" onClick={onRetry}>
          Retry
        </Button>
      </div>
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
      <div className="mb-4 flex items-center gap-2">
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
