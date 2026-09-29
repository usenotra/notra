"use client";

import { cn } from "cn";

import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { ClaudeUsageRingProps } from "../types/claude";

const RING_RADIUS = 5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export const ClaudeUsageRing = ({
  className,
  label = "Context left",
  size = 14,
  value,
  ...props
}: ClaudeUsageRingProps) => {
  const percent = clampPercent(value);
  const text = `${Math.round(percent)}% ${label.toLowerCase()}`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              "text-claude-usage inline-flex shrink-0 items-center justify-center",
              className
            )}
            data-slot="claude-usage-ring"
            {...props}
          />
        }
      >
        <svg
          aria-hidden="true"
          className="-rotate-90"
          fill="none"
          height={size}
          viewBox="0 0 14 14"
          width={size}
        >
          <circle
            className="stroke-claude-hover"
            cx="7"
            cy="7"
            r={RING_RADIUS}
            strokeWidth={1.75}
          />
          <circle
            cx="7"
            cy="7"
            r={RING_RADIUS}
            stroke="currentColor"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - percent / 100)}
            strokeLinecap="round"
            strokeWidth={1.75}
          />
        </svg>
        <Progress
          aria-label={label}
          className="sr-only"
          getAriaValueText={() => text}
          value={Math.round(percent)}
        />
      </TooltipTrigger>
      <TooltipContent
        className="bg-claude-tooltip font-claude text-claude-tooltip-fg rounded-md px-2 py-1 text-xs [&>div]:hidden"
        side="top"
        sideOffset={6}
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
};
