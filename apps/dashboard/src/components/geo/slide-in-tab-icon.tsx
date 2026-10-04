"use client";

import { cn } from "@/lib/utils";
import type { SlideInTabIconProps } from "@/types/geo";

/**
 * Icon that only shows on the active tab: it widens and fades in beside the
 * label, so inactive tabs stay text-only. `SlidingTabIndicator` follows the
 * resize frame by frame. `pinned` keeps it visible anyway,
 * e.g. for a live scan spinner.
 */
export function SlideInTabIcon({
  children,
  pinned = false,
}: SlideInTabIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "duration-normal ease-emphasized -me-1.5 flex w-0 shrink-0 items-center justify-center overflow-hidden opacity-0 transition-all group-data-active/tab:me-0 group-data-active/tab:w-4 group-data-active/tab:opacity-100 motion-reduce:transition-none",
        pinned && "me-0 w-4 opacity-100"
      )}
    >
      <span
        className={cn(
          "duration-normal ease-emphasized flex scale-50 items-center transition-transform group-data-active/tab:scale-100 motion-reduce:transition-none",
          pinned && "scale-100"
        )}
      >
        {children}
      </span>
    </span>
  );
}
