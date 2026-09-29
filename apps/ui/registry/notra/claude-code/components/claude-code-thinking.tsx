"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Kbd } from "@/components/ui/kbd";

import type { ClaudeCodeThinkingProps } from "../types/claude-code";

export const ClaudeCodeThinking = ({
  children,
  className,
  label = "Thinking…",
  ...props
}: ClaudeCodeThinkingProps) => (
  <Collapsible
    className={cn(
      "group/claude-code-thinking font-claude-code text-claude-code-comment text-[0.8125rem] leading-[1.125rem] italic",
      className
    )}
    data-slot="claude-code-thinking"
    {...props}
  >
    <CollapsibleTrigger
      render={
        <Button
          className="text-claude-code-comment hover:text-claude-code-detail focus-visible:ring-claude-code-arg/60 aria-expanded:text-claude-code-detail flex h-auto w-full items-baseline justify-start gap-2 rounded-none border-0 bg-transparent p-0 text-start text-[0.8125rem] leading-[1.125rem] font-normal whitespace-normal italic hover:bg-transparent focus-visible:border-transparent focus-visible:ring-1 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent"
          variant="ghost"
        />
      }
    >
      <span aria-hidden="true" className="not-italic">
        ∴
      </span>
      <span>{label}</span>
      <span className="group-data-open/claude-code-thinking:hidden">
        (
        <Kbd className="text-claude-code-comment h-auto min-w-0 bg-transparent p-0 font-[inherit] text-[length:inherit] font-normal italic">
          ctrl+o
        </Kbd>{" "}
        to expand)
      </span>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="text-claude-code-detail mt-1 ps-4 whitespace-pre-wrap">
        {children}
      </div>
    </CollapsibleContent>
  </Collapsible>
);
