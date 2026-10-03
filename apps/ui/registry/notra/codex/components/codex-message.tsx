import { cn } from "cn";

import { CODEX_ROW_CLASS } from "../constants/codex";
import type { CodexMessageProps } from "../types/codex";

export const CodexMessage = ({
  children,
  className,
  from = "assistant",
  ...props
}: CodexMessageProps) => {
  if (from === "user") {
    return (
      <div
        className={cn(
          CODEX_ROW_CLASS,
          "bg-codex-band text-codex-fg w-full py-[1.3em]",
          className
        )}
        data-from="user"
        data-slot="codex-message"
        {...props}
      >
        <span aria-hidden="true" className="text-codex-dim">
          ›
        </span>
        <div className="min-w-0 wrap-break-word whitespace-pre-wrap">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(CODEX_ROW_CLASS, "text-codex-fg w-full", className)}
      data-from="assistant"
      data-slot="codex-message"
      {...props}
    >
      <span aria-hidden="true" className="text-codex-muted">
        •
      </span>
      <div className="flex min-w-0 flex-col gap-[1.3em] wrap-break-word">
        {children}
      </div>
    </div>
  );
};
