"use client";

import { SheetContent } from "@notra/ui/components/ui/sheet";
import { cn } from "@notra/ui/lib/utils";
import { type ComponentProps, useRef } from "react";

/**
 * Floating panel inset from the viewport edge, full height on desktop and
 * edge to edge on phones. `lg` fits a chat answer next to its header.
 */
const DETAIL_SHEET_CLASS =
  "gap-0 overflow-hidden p-0 outline-none data-[side=right]:inset-y-0 data-[side=right]:h-dvh data-[side=right]:w-full sm:rounded-2xl sm:border data-[side=right]:sm:inset-y-2 data-[side=right]:sm:right-2 data-[side=right]:sm:h-[calc(100dvh-1rem)]";

const DETAIL_SHEET_WIDTH = {
  md: "data-[side=right]:sm:max-w-[min(calc(100vw-2rem),40rem)]",
  lg: "data-[side=right]:sm:max-w-[min(calc(100vw-2rem),54rem)]",
} as const;

/**
 * The app's detail drawer. A drawer opened from inside another one stacks on
 * top and slides its parent clear (see `Sheet`). The slide lives on the
 * popup, so keep this node mounted for the whole open session and swap only
 * its children, or a loading → ready swap replays the enter.
 */
export function DetailSheetContent({
  size = "lg",
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof SheetContent>, "side" | "variant"> & {
  size?: keyof typeof DETAIL_SHEET_WIDTH;
}) {
  // Focus the panel, not its first control: a copy box or tab would
  // otherwise open with a focus ring. Tab still reaches it first.
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <SheetContent
      className={cn(DETAIL_SHEET_CLASS, DETAIL_SHEET_WIDTH[size], className)}
      initialFocus={popupRef}
      ref={popupRef}
      side="right"
      {...props}
    >
      {children}
    </SheetContent>
  );
}
