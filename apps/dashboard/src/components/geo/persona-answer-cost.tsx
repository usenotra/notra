"use client";

import { GEO_PERSONA_BILLING_MULTIPLIER } from "@notra/geo-core/constants/geo-personas";

import { cn } from "@/lib/utils";
import type { PersonaAnswerCostBadgeProps } from "@/types/geo-personas-ui";

/** Marks persona runs as billing a multiple of a prompt answer. */
export function PersonaAnswerCostBadge({
  className,
}: PersonaAnswerCostBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "rounded-sm bg-current/15 px-1 text-xs leading-4 font-medium tabular-nums",
        className
      )}
    >
      {GEO_PERSONA_BILLING_MULTIPLIER}×
    </span>
  );
}
