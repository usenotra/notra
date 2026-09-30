"use client";

import { cn } from "cn";

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
    <CollapsibleTrigger className="focus-visible:ring-claude-code-muted/60 grid w-fit grid-cols-[2ch_auto] rounded-sm text-left italic outline-none focus-visible:ring-2">
      <span aria-hidden="true" className="not-italic">
        ∴
      </span>
      <span>
        {label}
        <span className="not-italic group-data-[open]/thinking:hidden">
          {" "}
          (ctrl+o to expand)
        </span>
      </span>
    </CollapsibleTrigger>
    <CollapsibleContent className="pl-[2ch] break-words whitespace-pre-wrap italic">
      {children}
    </CollapsibleContent>
  </Collapsible>
);
