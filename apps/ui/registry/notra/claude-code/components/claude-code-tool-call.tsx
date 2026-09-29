"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  CLAUDE_CODE_TOOL_STATUS_CLASSES,
  CLAUDE_CODE_TOOL_STATUS_LABELS,
} from "../constants/claude-code";
import type { ClaudeCodeToolCallProps } from "../types/claude-code";

export const ClaudeCodeToolCall = ({
  arg,
  children,
  className,
  defaultOpen = false,
  result,
  status = "success",
  tool,
  ...props
}: ClaudeCodeToolCallProps) => (
  <Collapsible
    className={cn(
      "group/claude-code-tool-call font-claude-code text-[0.8125rem] leading-[1.125rem]",
      className
    )}
    data-slot="claude-code-tool-call"
    data-status={status}
    defaultOpen={defaultOpen}
    {...props}
  >
    <CollapsibleTrigger
      render={
        <Button
          className="focus-visible:ring-claude-code-arg/60 flex h-auto w-full items-baseline justify-start gap-2 rounded-none border-0 bg-transparent p-0 text-start text-[0.8125rem] leading-[1.125rem] font-normal whitespace-normal hover:bg-transparent focus-visible:border-transparent focus-visible:ring-1 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent"
          variant="ghost"
        />
      }
    >
      <span
        aria-hidden="true"
        className={cn("shrink-0", CLAUDE_CODE_TOOL_STATUS_CLASSES[status])}
      >
        ⏺
      </span>
      <span className="min-w-0 wrap-break-word">
        <span className="text-claude-code-fg font-semibold">{tool}</span>
        {arg !== undefined && (
          <>
            <span className="text-claude-code-comment">(</span>
            <span className="text-claude-code-fg">{arg}</span>
            <span className="text-claude-code-comment">)</span>
          </>
        )}
        <span className="sr-only">
          {" "}
          ({CLAUDE_CODE_TOOL_STATUS_LABELS[status]})
        </span>
      </span>
      <span
        aria-hidden="true"
        className="text-claude-code-comment shrink-0 group-data-open/claude-code-tool-call:hidden"
      >
        ▸
      </span>
      <span
        aria-hidden="true"
        className="text-claude-code-comment hidden shrink-0 group-data-open/claude-code-tool-call:inline"
      >
        ▾
      </span>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="text-claude-code-detail flex min-w-0 items-baseline gap-2">
        <span aria-hidden="true" className="invisible shrink-0">
          ⏺
        </span>
        <span aria-hidden="true" className="text-claude-code-comment shrink-0">
          ⎿
        </span>
        <span className="min-w-0 wrap-break-word">{result}</span>
      </div>
      {children && (
        <div className="text-claude-code-detail mt-1 ps-8 whitespace-pre-wrap">
          {children}
        </div>
      )}
    </CollapsibleContent>
  </Collapsible>
);
