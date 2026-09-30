import type { ReactNode } from "react";
import { cn } from "@notra/ui/lib/utils";

export type ClaudeChatMessageRole = "user" | "assistant";

const actionsRevealClassName =
  "opacity-0 transition-opacity duration-fast [@media(hover:hover)]:group-hover/claude-msg:opacity-100 group-focus-within/claude-msg:opacity-100 [@media(hover:none)]:opacity-100";

export function ClaudeChatMessage({
  from,
  search,
  sources,
  actions,
  className,
  children,
}: {
  from: ClaudeChatMessageRole;
  search?: ReactNode;
  sources?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  if (from === "user") {
    return (
      <div
        className={cn(
          "group/claude-msg flex flex-col items-end gap-1.5",
          className
        )}
      >
        <div className="max-w-[70%] rounded-[1.35rem] bg-[#eceae4] px-[18px] py-2.5 text-[15px] leading-6 text-[#1f1e1b] dark:bg-white/10 dark:text-foreground">
          {children}
        </div>
        {actions ? (
          <div className={actionsRevealClassName}>{actions}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/claude-msg flex w-full flex-col items-start gap-4",
        className
      )}
    >
      {search}
      {children ? (
        <div className="max-w-full font-serif text-[17px] leading-[1.7] text-[#1f1e1b] dark:text-foreground">
          {children}
        </div>
      ) : null}
      {sources}
      {actions ? <div className={actionsRevealClassName}>{actions}</div> : null}
    </div>
  );
}
