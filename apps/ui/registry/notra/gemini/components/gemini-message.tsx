import { cn } from "cn";

import type { GeminiMessageProps } from "../types/gemini";

export const GeminiMessage = ({
  actions,
  children,
  className,
  from,
  status,
  thoughts,
  ...props
}: GeminiMessageProps) => {
  if (from === "user") {
    return (
      <div
        className={cn("font-gemini flex justify-end", className)}
        data-from="user"
        data-slot="gemini-message"
        {...props}
      >
        <div className="bg-gemini-bubble text-gemini-fg max-w-[70%] rounded-3xl rounded-se-sm px-4 py-2.5 text-[0.9375rem] leading-6 wrap-break-word">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/gemini-message font-gemini flex w-full flex-col items-start gap-3",
        className
      )}
      data-from="assistant"
      data-slot="gemini-message"
      {...props}
    >
      {thoughts}
      {status}
      {children ? (
        <div className="text-gemini-fg max-w-full text-[0.9375rem] leading-[1.65] wrap-break-word">
          {children}
        </div>
      ) : null}
      {actions ? (
        <div className="-ms-1.5 opacity-0 transition-opacity duration-150 group-focus-within/gemini-message:opacity-100 motion-reduce:transition-none [@media(hover:hover)]:group-hover/gemini-message:opacity-100 [@media(hover:none)]:opacity-100">
          {actions}
        </div>
      ) : null}
    </div>
  );
};
