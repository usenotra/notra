import type { ReactNode } from "react";
import { cn } from "@notra/ui/lib/utils";

export type GeminiMessageRole = "user" | "assistant";

const actionsRevealClassName =
  "opacity-0 transition-opacity duration-fast [@media(hover:hover)]:group-hover/gemini-msg:opacity-100 group-focus-within/gemini-msg:opacity-100 [@media(hover:none)]:opacity-100";

export function GeminiMessage({
  from,
  status,
  actions,
  className,
  children,
}: {
  from: GeminiMessageRole;
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  if (from === "user") {
    return (
      <div className={cn("flex justify-end", className)}>
        <div className="max-w-[70%] rounded-[1.75rem] bg-[#f0f0f0] px-[18px] py-2.5 text-[15px] leading-6 text-[#1f1f1f] dark:bg-white/10 dark:text-foreground">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/gemini-msg flex w-full flex-col items-start gap-3",
        className
      )}
    >
      {status}
      {children ? (
        <div className="max-w-full text-[16px] leading-[1.65] text-[#1f1f1f] dark:text-foreground">
          {children}
        </div>
      ) : null}
      {actions ? (
        <div className={cn("-ms-1.5", actionsRevealClassName)}>{actions}</div>
      ) : null}
    </div>
  );
}
