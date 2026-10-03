import { cn } from "@notra/ui/lib/utils";
import type { ReactNode } from "react";

import { renderClaudeCodeInline } from "./claude-code-inline";

export function ClaudeCodeMessage({
  from = "assistant",
  className,
  children,
}: {
  from?: "user" | "assistant";
  className?: string;
  children: ReactNode;
}) {
  const isUser = from === "user";

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[2ch_minmax(0,1fr)] font-mono text-[13px] leading-5",
        isUser ? "bg-[#2e2e2e] text-white" : "text-[#f7f7f7]",
        className
      )}
      data-from={from}
    >
      <span
        aria-hidden="true"
        className={cn("select-none", isUser ? "text-[#5c5c5c]" : "text-white")}
      >
        {isUser ? "❯" : "●"}
      </span>
      <div className="min-w-0 break-words whitespace-pre-wrap">
        {typeof children === "string"
          ? renderClaudeCodeInline(children)
          : children}
      </div>
    </div>
  );
}
