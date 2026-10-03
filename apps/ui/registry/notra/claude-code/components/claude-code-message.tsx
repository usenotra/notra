import { cn } from "cn";

import { renderClaudeCodeChildren } from "../lib/claude-code-inline";
import type { ClaudeCodeMessageProps } from "../types/claude-code";

export const ClaudeCodeMessage = ({
  children,
  className,
  from = "assistant",
  ...props
}: ClaudeCodeMessageProps) => {
  const isUser = from === "user";

  return (
    <div
      className={cn(
        "font-claude-code grid min-w-0 grid-cols-[2ch_minmax(0,1fr)] text-[0.8125rem] leading-5",
        isUser
          ? "bg-claude-code-user-bg text-claude-code-strong"
          : "text-claude-code-fg",
        className
      )}
      data-from={from}
      data-slot="claude-code-message"
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "select-none",
          isUser ? "text-claude-code-user-prompt" : "text-claude-code-strong"
        )}
      >
        {isUser ? "❯" : "●"}
      </span>
      <div className="min-w-0 break-words whitespace-pre-wrap">
        {renderClaudeCodeChildren(children)}
      </div>
    </div>
  );
};
