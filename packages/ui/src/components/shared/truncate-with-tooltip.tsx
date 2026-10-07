"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@notra/ui/lib/utils";

interface TruncateWithTooltipProps {
  children: ReactNode;
  /** Tooltip text when `children` is not plain text. Defaults to `children`. */
  tooltip?: string;
  className?: string;
  contentClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

function isOverflowing(element: HTMLElement) {
  return element.scrollWidth > element.clientWidth;
}

export function TruncateWithTooltip({
  children,
  tooltip,
  className,
  contentClassName,
  side = "top",
  align = "start",
}: TruncateWithTooltipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  const content = tooltip ?? children;

  const update = () => {
    const element = ref.current;
    if (element) {
      setTruncated(isOverflowing(element));
    }
  };

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    // Observing reports the current size right away, so this also measures
    // on mount.
    const observer = new ResizeObserver(() => {
      setTruncated(isOverflowing(element));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [content]);

  // Measured again on hover too: a late web font widens the text without
  // resizing the box, which the observer above never sees.
  return (
    <Tooltip disabled={!truncated}>
      <TooltipTrigger
        render={
          <span
            className={cn("block w-full min-w-0 truncate", className)}
            onPointerEnter={update}
            ref={ref}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        align={align}
        className={cn("max-w-sm text-pretty", contentClassName)}
        side={side}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
