"use client";

import { HoverCardContent } from "@notra/ui/components/ui/hover-card";

import type { TrafficBreakdownCardProps } from "@/types/geo";

export function TrafficBreakdownCard({
  icon,
  title,
  aside,
  align = "start",
  children,
  onPointerEnter,
  onPointerLeave,
}: TrafficBreakdownCardProps) {
  return (
    <HoverCardContent
      align={align}
      className="w-80 rounded-2xl bg-transparent p-0 shadow-none ring-0"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      side="bottom"
    >
      <div className="border-shell-border bg-shell rounded-t-2xl border border-b-0 pb-5">
        <div className="flex items-center justify-between gap-3 px-3 py-2">
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
      </div>
      <div className="border-border bg-popover -mt-5 rounded-2xl border shadow-md">
        <div className="max-h-72 overflow-y-auto py-1">{children}</div>
      </div>
    </HoverCardContent>
  );
}
