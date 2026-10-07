"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useLocale } from "use-intl";

import { useFormatRelative } from "@/lib/hooks/use-format-relative";
import type { RelativeTimeProps } from "@/types/relative-time";

const ABSOLUTE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
};

/** Muted "2 hours ago" with the exact time in a tooltip. */
export function RelativeTime({ iso, className }: RelativeTimeProps) {
  const [absolute, setAbsolute] = useState(iso);
  const locale = useLocale();
  const formatRelative = useFormatRelative();

  useEffect(() => {
    // react-doctor-disable-next-line react-hooks-js/set-state-in-effect
    setAbsolute(new Date(iso).toLocaleString(locale, ABSOLUTE_TIME_OPTIONS));
  }, [iso, locale]);

  return (
    <Tooltip>
      <TooltipTrigger
        className={
          className ??
          "text-muted-foreground text-sm whitespace-nowrap tabular-nums"
        }
      >
        <time dateTime={iso}>{formatRelative(iso)}</time>
      </TooltipTrigger>
      <TooltipContent>{absolute}</TooltipContent>
    </Tooltip>
  );
}
