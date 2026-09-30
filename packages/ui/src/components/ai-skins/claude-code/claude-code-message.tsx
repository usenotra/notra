import { cn } from "@notra/ui/lib/utils";
import type { ReactNode } from "react";

const INLINE_TOKEN = /(`[^`]+`|\*\*[^*]+\*\*)/g;

/** Styles `code` in lavender and **bold** in bright white, like Claude Code. */
export function renderClaudeCodeInline(text: string): ReactNode[] {
  return text.split(INLINE_TOKEN).map((part, index) => {
    const key = `${index}-${part}`;
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return (
        <code className="font-mono text-[#a4b0fc]" key={key}>
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong className="font-bold text-white" key={key}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

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
