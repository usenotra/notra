import { cn } from "cn";

import type { ClaudeMessageProps } from "../types/claude";

const ACTIONS_REVEAL_CLASS =
  "opacity-0 transition-opacity duration-150 group-focus-within/claude-message:opacity-100 motion-reduce:transition-none [@media(hover:hover)]:group-hover/claude-message:opacity-100 [@media(hover:none)]:opacity-100";

export const ClaudeMessage = ({
  actions,
  children,
  className,
  from,
  search,
  sources,
  ...props
}: ClaudeMessageProps) => {
  if (from === "user") {
    return (
      <div
        className={cn(
          "group/claude-message font-claude flex flex-col items-end gap-1",
          className
        )}
        data-from="user"
        data-slot="claude-message"
        {...props}
      >
        <div className="bg-claude-bubble text-claude-fg max-w-[75%] rounded-xl px-4 py-2.5 text-[0.9375rem] leading-6 wrap-break-word">
          {children}
        </div>
        {actions && <div className={ACTIONS_REVEAL_CLASS}>{actions}</div>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/claude-message font-claude flex w-full flex-col items-start gap-3",
        className
      )}
      data-from="assistant"
      data-slot="claude-message"
      {...props}
    >
      {search}
      {(children != null || sources) && (
        <div className="font-claude-serif text-claude-fg flex max-w-full flex-col gap-4 text-[0.9375rem] leading-[1.65] wrap-break-word">
          {children}
          {sources}
        </div>
      )}
      {actions && <div className={ACTIONS_REVEAL_CLASS}>{actions}</div>}
    </div>
  );
};
