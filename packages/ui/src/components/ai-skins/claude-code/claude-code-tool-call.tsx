"use client";

import { cn } from "@notra/ui/lib/utils";
import type { ReactNode } from "react";
import { useState } from "react";

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
  const [open, setOpen] = useState(defaultOpen);
  const style = STATUS_STYLE[status];
  const hasDetail = Boolean(children);
  const resultLine = (
    <>
      <span aria-hidden="true">⎿</span>
      <span className="min-w-0 break-words whitespace-pre-wrap">
        {result}
        {hasDetail && !open ? " (ctrl+o to expand)" : null}
      </span>
    </>
  );

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col font-mono text-[13px] leading-5 text-[#f7f7f7]",
        className
      )}
      data-status={status}
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
        <button
          aria-expanded={open}
          className={cn(
            RESULT_ROW,
            "w-full rounded-sm text-left text-[#8c8c8c] outline-none hover:text-[#f7f7f7] focus-visible:ring-2 focus-visible:ring-[#8c8c8c]/60"
          )}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {resultLine}
        </button>
      ) : (
        <p className={cn(RESULT_ROW, "text-[#8c8c8c]")}>{resultLine}</p>
      )}
      {hasDetail && open ? (
        <div className="pl-[5ch] break-words whitespace-pre-wrap text-[#8c8c8c]">
          {children}
        </div>
      ) : null}
    </div>
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
  const [open, setOpen] = useState(defaultOpen);
  const summary = (
    <>
      {verb} <span className="font-bold">{count}</span>{" "}
      {count === 1 ? noun : `${noun}s`}
    </>
  );

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-5 pl-[2ch] font-mono text-[13px] leading-5 text-[#8c8c8c]",
        className
      )}
    >
      {children ? (
        <button
          aria-expanded={open}
          className="w-fit rounded-sm text-left outline-none hover:text-[#f7f7f7] focus-visible:ring-2 focus-visible:ring-[#8c8c8c]/60"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {summary}
        </button>
      ) : (
        <p>{summary}</p>
      )}
      {children && open ? (
        <div className="-ml-[2ch] flex flex-col gap-5">{children}</div>
      ) : null}
    </div>
  );
}
