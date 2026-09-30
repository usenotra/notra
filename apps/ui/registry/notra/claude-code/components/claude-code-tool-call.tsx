"use client";

import { cn } from "cn";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  CLAUDE_CODE_RESULT_GLYPH,
  CLAUDE_CODE_TOOL_CALLS,
} from "../constants/claude-code";
import type {
  ClaudeCodeToolCallProps,
  ClaudeCodeToolSummaryProps,
} from "../types/claude-code";

const ROW = "grid min-w-0 grid-cols-[2ch_minmax(0,1fr)]";
const RESULT_ROW = "grid min-w-0 grid-cols-[3ch_minmax(0,1fr)] pl-[2ch]";

export const ClaudeCodeToolCall = ({
  arg,
  children,
  className,
  result,
  status = "success",
  tool,
  ...props
}: ClaudeCodeToolCallProps) => {
  const config = CLAUDE_CODE_TOOL_CALLS[status];
  const hasDetail = Boolean(children);
  const resultLine = (
    <>
      <span aria-hidden="true">{CLAUDE_CODE_RESULT_GLYPH}</span>
      <span className="min-w-0 break-words whitespace-pre-wrap">
        {result}
        {hasDetail && (
          <span className="group-data-[open]/tool:hidden">
            {" "}
            (ctrl+o to expand)
          </span>
        )}
      </span>
    </>
  );

  return (
    <Collapsible
      className={cn(
        "group/tool font-claude-code text-claude-code-fg flex min-w-0 flex-col text-[0.8125rem] leading-5",
        className
      )}
      data-slot="claude-code-tool-call"
      data-status={status}
      {...props}
    >
      <p className={ROW}>
        <span aria-hidden="true" className={config.className}>
          ●
        </span>
        <span className="min-w-0 break-words">
          <span className="sr-only">{config.srLabel}: </span>
          {arg === undefined ? (
            tool
          ) : (
            <>
              <span className="text-claude-code-strong font-bold">{tool}</span>
              <span>({arg})</span>
            </>
          )}
        </span>
      </p>
      {hasDetail ? (
        <CollapsibleTrigger
          className={cn(
            RESULT_ROW,
            "text-claude-code-muted hover:text-claude-code-fg focus-visible:ring-claude-code-muted/60 w-full rounded-sm text-left outline-none focus-visible:ring-2"
          )}
        >
          {resultLine}
        </CollapsibleTrigger>
      ) : (
        <p className={cn(RESULT_ROW, "text-claude-code-muted")}>{resultLine}</p>
      )}
      {hasDetail && (
        <CollapsibleContent className="text-claude-code-muted pl-[5ch] break-words whitespace-pre-wrap">
          {children}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

export const ClaudeCodeToolSummary = ({
  children,
  className,
  count,
  noun = "shell command",
  verb = "Ran",
  ...props
}: ClaudeCodeToolSummaryProps) => {
  const label = count === 1 ? noun : `${noun}s`;
  const summary = (
    <>
      {verb} <span className="font-bold">{count}</span> {label}
    </>
  );

  return (
    <Collapsible
      className={cn(
        "group/summary font-claude-code text-claude-code-muted flex min-w-0 flex-col gap-5 pl-[2ch] text-[0.8125rem] leading-5",
        className
      )}
      data-slot="claude-code-tool-summary"
      {...props}
    >
      {children ? (
        <CollapsibleTrigger className="hover:text-claude-code-fg focus-visible:ring-claude-code-muted/60 w-fit rounded-sm text-left outline-none focus-visible:ring-2">
          {summary}
          <span className="opacity-0 transition-opacity group-focus-within/summary:opacity-100 group-hover/summary:opacity-100 group-data-[open]/summary:hidden">
            {" "}
            (ctrl+o to expand)
          </span>
        </CollapsibleTrigger>
      ) : (
        <p>{summary}</p>
      )}
      {children && (
        <CollapsibleContent className="-ml-[2ch] flex flex-col gap-5">
          {children}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};
