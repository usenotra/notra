import { cn } from "cn";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { ClaudeCodeTerminalProps } from "../types/claude-code";

export const ClaudeCodeTerminal = ({
  children,
  className,
  contentClassName,
  title,
  ...props
}: ClaudeCodeTerminalProps) => (
  <Card
    className={cn(
      "bg-claude-code-bg font-claude-code w-full min-w-0 gap-0 overflow-clip rounded-[1.25rem] py-0 shadow-[0_1.5rem_3.5rem_-1rem_var(--claude-code-shadow)] ring-0",
      className
    )}
    data-slot="claude-code-terminal"
    {...props}
  >
    <CardHeader className="bg-claude-code-chrome flex shrink-0 items-center gap-3 rounded-none px-4.5 py-3">
      <div aria-hidden="true" className="flex items-center gap-1.5">
        <span className="bg-claude-code-traffic size-2.5 shrink-0 rounded-full" />
        <span className="bg-claude-code-traffic size-2.5 shrink-0 rounded-full" />
        <span className="bg-claude-code-traffic size-2.5 shrink-0 rounded-full" />
      </div>
      {title && (
        <CardTitle className="font-claude-code text-claude-code-title min-w-0 truncate text-xs leading-4 font-normal">
          {title}
        </CardTitle>
      )}
    </CardHeader>
    <ScrollArea className="min-h-0 flex-1">
      <CardContent
        className={cn(
          "flex flex-col gap-[1.125rem] p-4 sm:p-6",
          contentClassName
        )}
        data-slot="claude-code-terminal-content"
      >
        {children}
      </CardContent>
    </ScrollArea>
  </Card>
);
