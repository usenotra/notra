"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { CodexReasoningProps } from "../types/codex";

export const CodexReasoning = ({
  children,
  className,
  label = "Thinking",
  ...props
}: CodexReasoningProps) => (
  <Collapsible
    className={cn(
      "group/codex-reasoning font-codex text-codex-fg text-[0.8125rem] leading-[1.3]",
      className
    )}
    data-slot="codex-reasoning"
    {...props}
  >
    <CollapsibleTrigger
      render={
        <Button
          className="hover:text-codex-fg aria-expanded:text-codex-fg focus-visible:ring-codex-green/60 flex h-auto w-full items-baseline justify-start gap-[1ch] rounded-xs p-0 text-start text-[length:inherit] leading-[inherit] font-normal whitespace-normal hover:bg-transparent focus-visible:border-transparent focus-visible:ring-1 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent"
          variant="ghost"
        />
      }
    >
      <span aria-hidden="true" className="text-codex-dim">
        •
      </span>
      <span className="text-codex-dim font-bold italic">{label}</span>
      <span
        aria-hidden="true"
        className="text-codex-dim inline-block transition-transform duration-150 group-data-panel-open/codex-reasoning:rotate-90 motion-reduce:transition-none"
      >
        ▸
      </span>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="text-codex-dim ps-[2ch] whitespace-pre-wrap italic">
        {children}
      </div>
    </CollapsibleContent>
  </Collapsible>
);
