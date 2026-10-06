"use client";

import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import type { InstrumentRevealProps } from "@/types/instrument";

export function InstrumentReveal({
  active,
  order = 0,
  children,
  className,
}: InstrumentRevealProps) {
  return (
    <div
      className={cn(
        "duration-normal ease-emphasized flex min-w-0 flex-col transition delay-(--reveal-delay) motion-reduce:translate-none motion-reduce:transition-none motion-reduce:delay-0",
        active ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
        className
      )}
      style={{ "--reveal-delay": `${order * 45}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
