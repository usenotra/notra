"use client";

import { HoverCardContent } from "@notra/ui/components/ui/hover-card";
import type {
  DetailCardContentProps,
  DetailCardRowProps,
} from "@notra/ui/types/detail-card";

// Hover card with a shell header and a body panel. The shell keeps a 2px rim
// around the body on the left, right and bottom, like dualtone tables.
export function DetailCardContent({
  icon,
  title,
  aside,
  align = "start",
  children,
  onPointerEnter,
  onPointerLeave,
}: DetailCardContentProps) {
  return (
    <HoverCardContent
      align={align}
      className="border-shell-border bg-shell w-80 rounded-2xl border p-0.5 pt-0 shadow-md ring-0"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      side="bottom"
    >
      <div className="flex items-center justify-between gap-3 px-2.5 py-2">
        <span className="text-foreground flex min-w-0 items-center gap-2 text-sm font-semibold">
          {icon}
          <span className="truncate">{title}</span>
        </span>
        {aside ? (
          <span className="text-muted-foreground min-w-0 shrink-0 text-xs tabular-nums">
            {aside}
          </span>
        ) : null}
      </div>
      <div className="border-border bg-popover rounded-[14px] border">
        <div className="max-h-72 overflow-y-auto py-1">{children}</div>
      </div>
    </HoverCardContent>
  );
}

export function DetailCardRow({ label, children }: DetailCardRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-1.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="m-0 text-xs font-medium tabular-nums">{children}</dd>
    </div>
  );
}
