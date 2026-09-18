"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { useState } from "react";

import { CommentItem } from "@/components/comments/comment-item";
import { COMMENT_REPLY_PREVIEW_COUNT } from "@/constants/comments";
import type { CommentRepliesProps } from "@/types/comments";

export function CommentReplies({ replies, itemProps }: CommentRepliesProps) {
  const [expanded, setExpanded] = useState(false);
  const remainingCount = Math.max(
    0,
    replies.length - COMMENT_REPLY_PREVIEW_COUNT
  );

  if (!replies.length) {
    return null;
  }

  return (
    <div>
      <ol className="ml-4 pl-5">
        {replies.slice(0, COMMENT_REPLY_PREVIEW_COUNT).map((child) => (
          <CommentItem {...itemProps} comment={child} key={child.id} />
        ))}
      </ol>
      {remainingCount > 0 ? (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleContent
            keepMounted
            className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-out data-[ending-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:h-0 data-[starting-style]:opacity-0 motion-reduce:transition-none"
          >
            <ol start={COMMENT_REPLY_PREVIEW_COUNT + 1} className="ml-4 pl-5">
              {replies.slice(COMMENT_REPLY_PREVIEW_COUNT).map((child) => (
                <CommentItem {...itemProps} comment={child} key={child.id} />
              ))}
            </ol>
          </CollapsibleContent>
          <div className="relative pb-1">
            {expanded ? null : (
              <span
                aria-hidden="true"
                className="border-border/70 pointer-events-none absolute top-0 left-4 h-3 w-5 rounded-bl-lg border-b border-l"
              />
            )}
            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 ml-11 inline-flex min-h-6 items-center rounded-sm text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none">
              {expanded
                ? "Show fewer comments"
                : `View ${remainingCount} more ${remainingCount === 1 ? "comment" : "comments"}`}
            </CollapsibleTrigger>
          </div>
        </Collapsible>
      ) : null}
    </div>
  );
}
