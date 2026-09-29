import { cn } from "cn";

import type { ChatgptMessageProps } from "../types/chatgpt";

export const ChatgptMessage = ({
  actions,
  children,
  className,
  from,
  reasoning,
  ...props
}: ChatgptMessageProps) => {
  if (from === "user") {
    return (
      <div
        className={cn("font-chatgpt flex justify-end", className)}
        data-from="user"
        data-slot="chatgpt-message"
        {...props}
      >
        <div className="bg-chatgpt-bubble text-chatgpt-fg max-w-[70%] rounded-[1.125rem] px-4 py-1.5 text-base leading-6 wrap-break-word">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/chatgpt-message font-chatgpt flex flex-col items-start gap-2",
        className
      )}
      data-from="assistant"
      data-slot="chatgpt-message"
      {...props}
    >
      {reasoning}
      <div className="text-chatgpt-fg max-w-full text-base leading-7 wrap-break-word">
        {children}
      </div>
      {actions && (
        <div className="-ms-2 opacity-0 transition-opacity duration-150 group-focus-within/chatgpt-message:opacity-100 motion-reduce:transition-none [@media(hover:hover)]:group-hover/chatgpt-message:opacity-100 [@media(hover:none)]:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
};
