"use client";

import type { CommentThreadLinesProps } from "@/types/comments";

export function CommentThreadLines({
  parentId,
  isLastReply,
}: CommentThreadLinesProps) {
  if (!parentId) {
    return null;
  }

  return (
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
      {isLastReply ? null : (
        <span
          aria-hidden="true"
          className="border-border/70 pointer-events-none absolute top-6 bottom-0 -left-5 border-l"
        />
      )}
    </>
  );
}
