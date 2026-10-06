"use client";

import { ArrowUp02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Composer } from "@notra/ui/components/ui/composer";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { cn } from "@notra/ui/lib/utils";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { DiscussionComposerProps } from "@/types/comments";

export function DiscussionComposer({
  draft,
  reply,
  busy,
  canSubmit,
  textarea,
  onDraftChange,
  onSubmit,
  onCancelReply,
  sticky = true,
}: DiscussionComposerProps) {
  const t = useTranslations("comments");
  return (
    <form
      className={cn(
        "bg-background flex items-start gap-3 pt-2 pb-1",
        sticky && "sticky bottom-0"
      )}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Composer.Frame
        className="min-w-0 flex-1"
        flat
        nudge={
          reply ? (
            <Composer.Nudge
              title={t("replyingTo", { name: reply.name })}
              action={
                <Button
                  aria-label={t("cancelReply")}
                  size="icon-sm"
                  variant="ghost"
                  onClick={onCancelReply}
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                </Button>
              }
            />
          ) : null
        }
      >
        <div className="flex items-end gap-2 p-1.5">
          <Textarea
            ref={textarea}
            aria-label={
              reply ? t("replyTo", { name: reply.name }) : t("writeComment")
            }
            placeholder={
              reply ? t("writeReplyPlaceholder") : t("writeCommentPlaceholder")
            }
            className="max-h-32 min-h-7 flex-1 resize-none border-0 bg-transparent px-2 py-1 text-sm leading-5 shadow-none focus-visible:ring-0 dark:bg-transparent"
            rows={1}
            maxLength={10000}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                (event.metaKey || event.ctrlKey) &&
                event.key === "Enter" &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                onSubmit();
              }
            }}
          />
          <Composer.Send
            label={t("send")}
            tooltip={t("send")}
            busy={busy}
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            <HugeiconsIcon icon={ArrowUp02Icon} className="size-4" />
          </Composer.Send>
        </div>
      </Composer.Frame>
    </form>
  );
}
