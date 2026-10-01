"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { ClaudeCodeThinkingProps } from "../types/claude-code";

export const ClaudeCodeThinking = ({
  children,
  className,
  label = "Thinking…",
  ...props
}: ClaudeCodeThinkingProps) => (
  <Collapsible
    className={cn(
      "group/thinking font-claude-code text-claude-code-muted flex min-w-0 flex-col text-[0.8125rem] leading-5",
      className
    )}
    data-slot="claude-code-thinking"
    {...props}
  >
    <CollapsibleTrigger
      render={
        <Button
          className="text-claude-code-muted hover:text-claude-code-muted aria-expanded:text-claude-code-muted focus-visible:ring-claude-code-muted/60 grid h-auto w-fit grid-cols-[2ch_auto] justify-start rounded-sm border-0 p-0 text-start text-[length:inherit] leading-[inherit] font-normal whitespace-normal italic hover:bg-transparent focus-visible:border-transparent focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent"
          variant="ghost"
        />
      }
    >
      <span aria-hidden="true" className="not-italic">
        ∴
      </span>
      <span>
        {label}
        <span className="not-italic group-data-[open]/thinking:hidden">
          {" "}
          (click to expand)
        </span>
      </span>
    </CollapsibleTrigger>
    <CollapsibleContent className="pl-[2ch] break-words whitespace-pre-wrap italic">
      {children}
    </CollapsibleContent>
  </Collapsible>
);
