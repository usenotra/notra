"use client";

import { MessageResponse } from "@notra/ui/components/ai-elements/message";
import { useState } from "react";
import { toast } from "sonner";

import { BlogPreviewActions } from "@/components/ai/blog-preview-actions";
import { useContent } from "@/lib/hooks/use-content";
import type {
  BlogChangelogPreviewProps,
  BlogChangelogPreviewUserAction,
} from "@/types/content/ai-preview";
import {
  blogPreviewEffectiveState,
  isBlogPreviewBusy,
} from "@/utils/blog-preview-state";
import { getOutputTypeLabel, OutputTypeIcon } from "@/utils/output-types";

export function BlogChangelogPreview({
  organizationId,
  organizationSlug,
  postId,
  onRevise,
  state: incomingState,
  title: initialTitle,
  markdown: initialMarkdown,
  contentType,
  persistedStatus = "draft",
  readOnly = false,
  onApprove,
  onDeny,
  onPersist,
}: BlogChangelogPreviewProps) {
  const { data: savedPost } = useContent(organizationId, postId ?? "");
  const title = savedPost?.content.title ?? initialTitle;
  const markdown = savedPost?.content.markdown ?? initialMarkdown;
  const savedStatus = savedPost?.content.status ?? persistedStatus;
  const [userAction, setUserAction] =
    useState<BlogChangelogPreviewUserAction>("none");
  const effectiveState = blogPreviewEffectiveState(incomingState, userAction);
  const isFinished = effectiveState === "finished";
  const isSaving = !isFinished && isBlogPreviewBusy(userAction);
  const canSave = !readOnly && !isFinished && Boolean(onPersist || onApprove);

  async function handleSave() {
    setUserAction("saving");
    const toastId = toast.loading("Saving draft...");
    try {
      if (onPersist) {
        await onPersist("draft", { title, markdown });
        setUserAction("saved");
        toast.success("Saved as draft", { id: toastId });
      } else if (onApprove) {
        await onApprove();
        toast.dismiss(toastId);
      }
    } catch {
      setUserAction("save-failed");
      toast.error("Failed to save draft. Try again.", { id: toastId });
    }
  }

  return (
    <div className="border-border bg-background ml-px max-w-xl overflow-hidden rounded-lg border">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <OutputTypeIcon className="size-3" outputType={contentType} />
            {getOutputTypeLabel(contentType)}
          </span>
          <h3 className="text-sm font-medium text-pretty">{title}</h3>
        </div>
      </div>
      <div
        aria-label={`${getOutputTypeLabel(contentType)} content`}
        className="focus-visible:ring-ring max-h-96 overflow-y-auto overscroll-contain px-4 pb-4 focus-visible:ring-2 focus-visible:outline-none"
        role="region"
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The scrollable preview must be reachable for keyboard scrolling.
        tabIndex={0}
      >
        <MessageResponse mode="static" className="text-sm leading-relaxed">
          {markdown}
        </MessageResponse>
      </div>
      <BlogPreviewActions
        organizationSlug={organizationSlug}
        postId={postId}
        onRevise={readOnly ? undefined : onRevise}
        onDeny={onDeny}
        onSave={handleSave}
        isFinished={isFinished}
        isSaving={isSaving}
        canSave={canSave}
        savedStatus={savedStatus}
      />
      {!isFinished && userAction === "save-failed" ? (
        <p className="text-destructive px-4 pb-3 text-sm" role="alert">
          Could not save the draft. Try again.
        </p>
      ) : null}
    </div>
  );
}
