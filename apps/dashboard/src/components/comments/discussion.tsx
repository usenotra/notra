"use client";

import { Comment01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@notra/ui/components/ui/empty";
import { useTranslations } from "use-intl";

import { DiscussionComposer } from "@/components/comments/discussion-composer";
import { DiscussionList } from "@/components/comments/discussion-list";
import { useDiscussion } from "@/lib/hooks/use-discussion";
import type { DiscussionFeedProps, DiscussionProps } from "@/types/comments";

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
  const t = useTranslations("comments");
  const tCommon = useTranslations("common.actions");
  if (isPending) {
    return (
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
    );
  }
  if (isError) {
    return (
      <p className="text-muted-foreground py-2 text-sm" role="alert">
        {t("loadFailed")}{" "}
        <button
          className="text-foreground underline-offset-4 hover:underline"
          onClick={onRetry}
          type="button"
        >
          {tCommon("tryAgain")}
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

export function Discussion({
  showEmptyState = false,
  ...target
}: DiscussionProps) {
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
  const t = useTranslations("comments");
  const isEmpty =
    showEmptyState &&
    !query.isPending &&
    !query.isError &&
    items.every((item) => item.deletedAt);

  return (
    <section
      ref={section}
      className="w-full border-t pt-6"
      aria-label={t("title")}
    >
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="text-sm font-medium">{t("title")}</h3>
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
      {isEmpty ? (
        <Empty className="gap-0 py-2 md:py-2">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Comment01Icon} />
            </EmptyMedia>
            <EmptyTitle className="text-base">{t("emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      <DiscussionComposer
        draft={draft}
        reply={reply}
        busy={busy}
        canSubmit={Boolean(draft.trim() && user && !busy)}
        textarea={textarea}
        onDraftChange={setDraft}
        onSubmit={submit}
        sticky={!isEmpty}
        onCancelReply={() => {
          setReply(null);
          textarea.current?.focus();
        }}
      />
    </section>
  );
}
