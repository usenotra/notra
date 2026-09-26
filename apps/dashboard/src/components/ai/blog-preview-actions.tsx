import { Loader2Icon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/button";
import type { BlogPreviewActionsProps } from "@/types/content/ai-preview";

export function BlogPreviewActions({
  organizationSlug,
  postId,
  onRevise,
  onDeny,
  onSave,
  isFinished,
  isSaving,
  canSave,
  savedStatus,
}: BlogPreviewActionsProps) {
  if (isFinished) {
    return (
      <div className="border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        {savedStatus === "published" ? (
          <span className="text-muted-foreground text-xs">Published</span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {onRevise ? (
            <Button onClick={onRevise} size="sm" variant="ghost">
              Ask for changes
            </Button>
          ) : null}
          {postId ? (
            <Button
              nativeButton={false}
              render={<Link href={`/${organizationSlug}/content/${postId}`} />}
              size="sm"
            >
              Open in editor
            </Button>
          ) : null}
        </div>
      </div>
    );
  }
  if (!canSave) {
    return null;
  }
  return (
    <div className="border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      {onDeny ? (
        <Button
          className="-ml-2.5"
          disabled={isSaving}
          onClick={onDeny}
          size="sm"
          variant="ghost"
        >
          Discard
        </Button>
      ) : null}
      <Button
        className="ml-auto"
        disabled={isSaving}
        onClick={onSave}
        size="sm"
      >
        {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
        {isSaving ? "Saving draft" : "Save as draft"}
      </Button>
    </div>
  );
}
