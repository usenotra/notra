"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "cn";

import type { OpencodeScrollAreaProps } from "../types/opencode";

/** A scroll area with OpenCode's square, one-cell terminal scrollbar. */
export const OpencodeScrollArea = ({
  children,
  className,
  ...props
}: OpencodeScrollAreaProps) => (
  <ScrollAreaPrimitive.Root
    className={cn("relative", className)}
    data-slot="opencode-scroll-area"
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      className="focus-visible:outline-opencode-blue size-full outline-none focus-visible:outline-1 focus-visible:-outline-offset-1"
      data-slot="opencode-scroll-area-viewport"
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    {/* The track is a wider hit area, the thumb only paints its right edge. */}
    <ScrollAreaPrimitive.Scrollbar
      className="flex w-[1.5ch] touch-none select-none"
      orientation="vertical"
    >
      <ScrollAreaPrimitive.Thumb className="before:bg-opencode-subtle hover:before:bg-opencode-muted relative w-full before:absolute before:inset-y-0 before:right-0 before:w-[0.5ch] before:transition-colors" />
    </ScrollAreaPrimitive.Scrollbar>
  </ScrollAreaPrimitive.Root>
);
