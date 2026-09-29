import { cn } from "cn";

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
          "font-codex flex w-full min-w-0 items-baseline text-[0.8125rem] leading-[1.3]",
          className
        )}
        data-from="user"
        data-slot="codex-message"
        {...props}
      >
        <span aria-hidden="true" className="text-codex-green w-[2ch] shrink-0">
          ›
        </span>
        <span className="text-codex-fg min-w-0 flex-1 wrap-break-word">
          {children}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "font-codex text-codex-fg text-[0.8125rem] leading-[1.3] wrap-break-word",
        className
      )}
      data-from="assistant"
      data-slot="codex-message"
      {...props}
    >
      {children}
    </div>
  );
};
