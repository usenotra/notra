import type { ReactNode } from "react";
import { cn } from "@notra/ui/lib/utils";

export type PerplexityMessageRole = "user" | "assistant";

export function PerplexityMessage({
  from,
  search,
  actions,
  className,
  children,
}: {
  from: PerplexityMessageRole;
  search?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  if (from === "user") {
    return (
      <div className={cn("flex justify-end", className)}>
        <div className="max-w-[min(36rem,82%)] rounded-[1.35rem] bg-[#f3f3f3] px-[18px] py-2.5 font-sans text-[15px] leading-6 text-[#1a1a1a] dark:bg-white/10 dark:text-foreground">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex w-full flex-col items-start gap-2", className)}>
      {search}
      {children ? (
        <div className="max-w-[42rem] font-sans text-[17.5px] leading-[1.75] text-[#1a1a1a] dark:text-foreground">
          {children}
        </div>
      ) : null}
      {actions ? (
        <div className="-ms-1.5 w-full max-w-[42rem]">{actions}</div>
      ) : null}
    </div>
  );
}
