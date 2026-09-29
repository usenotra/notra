import { cn } from "cn";

import type { ClaudeCodeMessageProps } from "../types/claude-code";

export const ClaudeCodeMessage = ({
  children,
  className,
  from = "assistant",
  ...props
}: ClaudeCodeMessageProps) => {
  if (from === "user") {
    return (
      <div
        className={cn(
          "bg-claude-code-user-bg font-claude-code flex w-full min-w-0 items-baseline text-[0.8125rem] leading-[1.125rem]",
          className
        )}
        data-from="user"
        data-slot="claude-code-message"
        {...props}
      >
        <span
          aria-hidden="true"
          className="text-claude-code-user-prompt shrink-0"
        >
          ❯
        </span>
        <span aria-hidden="true" className="inline-block w-[1ch] shrink-0" />
        <span className="text-claude-code-strong min-w-0 flex-1 wrap-break-word">
          {children}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "font-claude-code text-claude-code-fg text-[0.8125rem] leading-[1.125rem]",
        className
      )}
      data-from="assistant"
      data-slot="claude-code-message"
      {...props}
    >
      {children}
    </div>
  );
};
