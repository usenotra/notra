"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { ChatgptActionButtonProps } from "../types/chatgpt";

export const ChatgptActionButton = ({
  children,
  className,
  label,
  ...props
}: ChatgptActionButtonProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          aria-label={label}
          className={cn(
            "text-chatgpt-muted hover:bg-chatgpt-hover hover:text-chatgpt-fg focus-visible:ring-chatgpt-focus/35 dark:hover:bg-chatgpt-hover size-8 rounded-lg border-0 transition-colors duration-150 focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0 motion-reduce:transition-none [&_svg:not([class*='size-'])]:size-4",
            className
          )}
          data-slot="chatgpt-action-button"
          size="icon"
          variant="ghost"
          {...props}
        />
      }
    >
      {children}
    </TooltipTrigger>
    <TooltipContent
      className="bg-chatgpt-tooltip font-chatgpt text-chatgpt-tooltip-fg rounded-lg px-2 py-1 text-xs font-medium [--color-background:var(--chatgpt-tooltip-fg)] [--color-foreground:var(--chatgpt-tooltip)]"
      side="bottom"
      sideOffset={6}
    >
      {label}
    </TooltipContent>
  </Tooltip>
);
