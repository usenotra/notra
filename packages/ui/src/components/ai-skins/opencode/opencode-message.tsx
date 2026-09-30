import { cn } from "@notra/ui/lib/utils";
import type { OpencodeMessageProps } from "@notra/ui/types/opencode-skin";

/**
 * Colors markdown inside a reply the way the TUI does: headings and strong
 * text in bold orange, inline code in green.
 */
const REPLY_MARKUP_CLASS =
  "[&_:is(h1,h2,h3,h4)]:font-bold [&_:is(h1,h2,h3,h4)]:text-opencode-tui-orange [&_code]:text-opencode-tui-green [&_li::marker]:text-opencode-tui-orange [&_strong]:font-bold [&_strong]:text-opencode-tui-orange";

export function OpencodeMessage({
  from = "assistant",
  search,
  actions,
  className,
  children,
}: OpencodeMessageProps) {
  if (from === "user") {
    return (
      <div
        className={cn(
          "whitespace-pre-wrap break-words border-opencode-tui-blue border-l-2 bg-opencode-tui-panel py-5 pr-[2ch] pl-[calc(3ch-2px)] font-mono text-[13px] text-opencode-tui-foreground leading-5",
          className
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col items-start gap-5 font-mono text-[13px] leading-5",
        className
      )}
    >
      {search}
      <div
        className={cn(
          "max-w-full break-words pl-[3ch] text-opencode-tui-foreground",
          REPLY_MARKUP_CLASS
        )}
      >
        {children}
      </div>
      {actions}
    </div>
  );
}
