"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

import { useFormatRelative } from "@/lib/hooks/use-format-relative";
import type { CommentTimestampProps } from "@/types/comments";

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
  const locale = useLocale();
  const formatRelative = useFormatRelative();

  useEffect(() => {
    // react-doctor-disable-next-line react-hooks-js/set-state-in-effect
    setAbsolute(
      new Date(createdAt).toLocaleString(locale, ABSOLUTE_TIME_OPTIONS)
    );
  }, [createdAt, locale]);

  return (
    <Tooltip>
      <TooltipTrigger className="text-muted-foreground focus-visible:ring-ring/50 rounded-sm leading-5 outline-none focus-visible:ring-2">
        <time dateTime={createdAt}>{formatRelative(createdAt)}</time>
      </TooltipTrigger>
      <TooltipContent>{absolute}</TooltipContent>
    </Tooltip>
  );
}
