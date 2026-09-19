"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useEffect, useState } from "react";

import type { CommentTimestampProps } from "@/types/comments";
import { formatRelative } from "@/utils/format-relative";

const ABSOLUTE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
};

export function CommentTimestamp({ createdAt }: CommentTimestampProps) {
  const [absolute, setAbsolute] = useState(createdAt);

  useEffect(() => {
    // react-doctor-disable-next-line react-hooks-js/set-state-in-effect
    setAbsolute(
      new Date(createdAt).toLocaleString(undefined, ABSOLUTE_TIME_OPTIONS)
    );
  }, [createdAt]);

  return (
    <Tooltip>
      <TooltipTrigger className="text-muted-foreground focus-visible:ring-ring/50 rounded-sm leading-5 outline-none focus-visible:ring-2">
        <time dateTime={createdAt}>{formatRelative(createdAt)}</time>
      </TooltipTrigger>
      <TooltipContent>{absolute}</TooltipContent>
    </Tooltip>
  );
}
