import { cn } from "cn";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { ClaudeCodeTerminalProps } from "../types/claude-code";

export const ClaudeCodeTerminal = ({
  children,
  className,
  contentClassName,
  footer,
  title,
  ...props
}: ClaudeCodeTerminalProps) => (
  <Card
    className={cn(
      "bg-claude-code-bg font-claude-code text-claude-code-fg ring-claude-code-ring w-full min-w-0 gap-0 overflow-clip rounded-xl py-0 shadow-[0_1.5rem_3.5rem_-1rem_var(--claude-code-shadow)] ring-1",
      className
    )}
    data-slot="claude-code-terminal"
    {...props}
  >
    <CardHeader className="bg-claude-code-chrome relative flex h-8 shrink-0 items-center justify-center rounded-none px-3 py-0">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-3 flex items-center gap-2"
      >
        <span className="bg-claude-code-traffic size-3 shrink-0 rounded-full" />
        <span className="bg-claude-code-traffic size-3 shrink-0 rounded-full" />
        <span className="bg-claude-code-traffic size-3 shrink-0 rounded-full" />
      </div>
      {title && (
        <CardTitle className="font-claude-code text-claude-code-title max-w-[60%] min-w-0 truncate text-xs leading-4 font-normal">
          {title}
        </CardTitle>
      )}
    </CardHeader>
    <ScrollArea className="min-h-0 flex-1">
      <CardContent
        className={cn(
          "flex flex-col gap-5 px-3 py-4 text-[0.8125rem] leading-5 sm:px-4",
          contentClassName
        )}
        data-slot="claude-code-terminal-content"
      >
        {children}
      </CardContent>
    </ScrollArea>
    {footer && (
      <div className="shrink-0 px-3 pb-3 text-[0.8125rem] leading-5 sm:px-4">
        {footer}
      </div>
    )}
  </Card>
);
