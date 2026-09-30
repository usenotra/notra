"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { cn } from "@notra/ui/lib/utils";
import type { ReactNode } from "react";

export type ClaudeCodeToolCallStatus = "success" | "error" | "pending";

const STATUS_STYLE: Record<
  ClaudeCodeToolCallStatus,
  { className: string; srLabel: string }
> = {
  success: { className: "text-[#4eba65]", srLabel: "Done" },
  error: { className: "text-[#ff6b80]", srLabel: "Failed" },
  pending: {
    className: "animate-pulse text-[#8c8c8c] motion-reduce:animate-none",
    srLabel: "Running",
  },
};

const RESULT_ROW = "grid min-w-0 grid-cols-[3ch_minmax(0,1fr)] pl-[2ch]";

export function ClaudeCodeToolCall({
  tool,
  arg,
  result,
  status = "success",
  defaultOpen = false,
  className,
  children,
}: {
  tool: string;
  arg?: string;
  result: ReactNode;
  status?: ClaudeCodeToolCallStatus;
  defaultOpen?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const style = STATUS_STYLE[status];
  const hasDetail = Boolean(children);
  const resultLine = (
    <>
      <span aria-hidden="true">⎿</span>
      <span className="min-w-0 break-words whitespace-pre-wrap">
        {result}
        {hasDetail ? (
          <span className="group-data-[open]/tool:hidden"> (click to expand)</span>
        ) : null}
      </span>
    </>
  );

  return (
    <Collapsible
      className={cn(
        "group/tool flex min-w-0 flex-col font-mono text-[13px] leading-5 text-[#f7f7f7]",
        className
      )}
      data-status={status}
      defaultOpen={defaultOpen}
    >
      <p className="grid min-w-0 grid-cols-[2ch_minmax(0,1fr)]">
        <span aria-hidden="true" className={style.className}>
          ●
        </span>
        <span className="min-w-0 break-words">
          <span className="sr-only">{style.srLabel}: </span>
          {arg === undefined ? (
            tool
          ) : (
            <>
              <span className="font-bold text-white">{tool}</span>({arg})
            </>
          )}
        </span>
      </p>
      {hasDetail ? (
        <CollapsibleTrigger
          className={cn(
            RESULT_ROW,
            "w-full rounded-sm text-left text-[#8c8c8c] outline-none hover:text-[#f7f7f7] focus-visible:ring-2 focus-visible:ring-[#8c8c8c]/60"
          )}
        >
          {resultLine}
        </CollapsibleTrigger>
      ) : (
        <p className={cn(RESULT_ROW, "text-[#8c8c8c]")}>{resultLine}</p>
      )}
      {hasDetail ? (
        <CollapsibleContent className="pl-[5ch] break-words whitespace-pre-wrap text-[#8c8c8c]">
          {children}
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}

export function ClaudeCodeToolSummary({
  count,
  noun = "shell command",
  verb = "Ran",
  defaultOpen = false,
  className,
  children,
}: {
  count: number;
  noun?: string;
  verb?: string;
  defaultOpen?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const summary = (
    <>
      {verb} <span className="font-bold">{count}</span>{" "}
      {count === 1 ? noun : `${noun}s`}
    </>
  );

  return (
    <Collapsible
      className={cn(
        "flex min-w-0 flex-col gap-5 pl-[2ch] font-mono text-[13px] leading-5 text-[#8c8c8c]",
        className
      )}
      defaultOpen={defaultOpen}
    >
      {children ? (
        <CollapsibleTrigger className="w-fit rounded-sm text-left outline-none hover:text-[#f7f7f7] focus-visible:ring-2 focus-visible:ring-[#8c8c8c]/60">
          {summary}
        </CollapsibleTrigger>
      ) : (
        <p>{summary}</p>
      )}
      {children ? (
        <CollapsibleContent className="-ml-[2ch] flex flex-col gap-5">
          {children}
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}
