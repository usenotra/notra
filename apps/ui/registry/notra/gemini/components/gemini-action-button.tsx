"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { GeminiActionButtonProps } from "../types/gemini";

export const GeminiActionButton = ({
  children,
  className,
  label,
  ...props
}: GeminiActionButtonProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          aria-label={label}
          className={cn(
            "text-gemini-muted hover:bg-gemini-hover hover:text-gemini-muted aria-expanded:bg-gemini-hover aria-expanded:text-gemini-muted dark:hover:bg-gemini-hover focus-visible:ring-gemini-focus/30 size-7 rounded-full border-0 transition-colors duration-150 focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0 motion-reduce:transition-none [&_svg:not([class*='size-'])]:size-4",
            className
          )}
          data-slot="gemini-action-button"
          size="icon"
          variant="ghost"
          {...props}
        />
      }
    >
      {children}
    </TooltipTrigger>
    <TooltipContent
      className="bg-gemini-tooltip font-gemini text-gemini-tooltip-fg *:bg-gemini-tooltip *:fill-gemini-tooltip rounded-md border-0 bg-none px-3 py-1.5 shadow-none [corner-shape:round]"
      side="bottom"
      sideOffset={6}
    >
      {label}
    </TooltipContent>
  </Tooltip>
);
