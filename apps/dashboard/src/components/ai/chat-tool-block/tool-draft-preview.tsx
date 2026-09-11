"use client";

import { Button } from "@notra/ui/components/ui/button";
import Link from "next/link";

import { TOOL_DRAFT_PREVIEW_MAX_CHARS } from "@/constants/chat-tool-draft";
import type { ToolDraftPreviewProps } from "@/types/components/chat-tool-draft";

function draftExcerpt(markdown: string): string {
  if (markdown.length <= TOOL_DRAFT_PREVIEW_MAX_CHARS) {
    return markdown;
  }
  return `${markdown.slice(0, TOOL_DRAFT_PREVIEW_MAX_CHARS).trimEnd()}…`;
}

export function ToolDraftPreview({
  title,
  markdown,
  editorHref,
  onApprove,
  onDeny,
}: ToolDraftPreviewProps) {
  const excerpt = draftExcerpt(markdown);

  return (
    <div className="border-border bg-muted/20 mt-3 space-y-3 rounded-lg border p-3">
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        {excerpt ? (
          <p className="text-muted-foreground text-xs leading-5 whitespace-pre-wrap">
            {excerpt}
          </p>
        ) : null}
      </div>
      {onApprove || onDeny || editorHref ? (
        <div className="flex flex-wrap items-center gap-2">
          {onApprove ? (
            <Button onClick={onApprove} size="sm" type="button">
              Save draft
            </Button>
          ) : null}
          {onDeny ? (
            <Button onClick={onDeny} size="sm" type="button" variant="ghost">
              Discard
            </Button>
          ) : null}
          {editorHref ? (
            <Button
              nativeButton={false}
              render={<Link href={editorHref} />}
              size="sm"
              variant="outline"
            >
              Open in editor
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
