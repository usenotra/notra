import { cn } from "cn";

import type { OpencodeMessageProps } from "../types/opencode";

export const OpencodeMessage = ({
  actions,
  children,
  className,
  from = "assistant",
  search,
  ...props
}: OpencodeMessageProps) => {
  if (from === "user") {
    return (
      <div
        className={cn(
          "border-opencode-purple bg-opencode-surface font-opencode text-opencode-fg border-s-2 px-[2ch] py-[1.0625rem] text-[0.8125rem] leading-[1.3] wrap-break-word",
          className
        )}
        data-from="user"
        data-slot="opencode-message"
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn("flex w-full flex-col items-start gap-3", className)}
      data-from="assistant"
      data-slot="opencode-message"
      {...props}
    >
      {search}
      <div className="font-opencode text-opencode-fg max-w-full text-[0.8125rem] leading-[1.3] wrap-break-word">
        {children}
      </div>
      {actions}
    </div>
  );
};
