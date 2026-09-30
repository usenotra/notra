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
    <ScrollAreaPrimitive.Scrollbar
      className="flex w-[0.5ch] touch-none select-none"
      orientation="vertical"
    >
      <ScrollAreaPrimitive.Thumb className="bg-opencode-subtle hover:bg-opencode-muted w-full transition-colors" />
    </ScrollAreaPrimitive.Scrollbar>
  </ScrollAreaPrimitive.Root>
);
