"use client";

import { RelativeTime } from "@/components/relative-time";
import type { CommentTimestampProps } from "@/types/comments";

export function CommentTimestamp({ createdAt }: CommentTimestampProps) {
  return (
    <RelativeTime
      className="text-muted-foreground focus-visible:ring-ring/50 rounded-sm leading-5 outline-none focus-visible:ring-2"
      iso={createdAt}
    />
  );
}
