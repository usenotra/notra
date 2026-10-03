import { cn } from "cn";

import type { OpencodeMessageProps } from "../types/opencode";

/**
 * Colors markup inside a reply the way the TUI renders markdown: headings
 * and strong text in orange, inline code in green, orange list dashes.
 */
const REPLY_MARKUP_CLASS =
  "[&_:is(h1,h2,h3,h4)]:text-opencode-orange [&_:is(h1,h2,h3,h4)]:text-[length:inherit] [&_:is(h1,h2,h3,h4)]:font-bold [&_code]:text-opencode-green [&_code]:font-[inherit] [&_code]:text-[length:inherit] [&_li]:ps-[2ch] [&_li]:before:-ms-[2ch] [&_li]:before:inline-block [&_li]:before:w-[2ch] [&_li]:before:text-opencode-orange [&_li]:before:content-['-'] [&_ol]:list-none [&_strong]:text-opencode-orange [&_strong]:font-bold [&_ul]:list-none [&>*+*]:mt-[1lh]";

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
          "border-opencode-blue bg-opencode-panel text-opencode-fg border-s-2 py-[1lh] ps-[calc(3ch-2px)] pe-[2ch] wrap-break-word whitespace-pre-wrap",
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
      className={cn("flex w-full min-w-0 flex-col gap-[1lh]", className)}
      data-from="assistant"
      data-slot="opencode-message"
      {...props}
    >
      {search}
      <div
        className={cn(
          "text-opencode-fg max-w-full ps-[3ch] wrap-break-word",
          REPLY_MARKUP_CLASS
        )}
      >
        {children}
      </div>
      {actions}
    </div>
  );
};
