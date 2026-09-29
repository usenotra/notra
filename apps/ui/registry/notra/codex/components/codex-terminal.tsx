import { cn } from "cn";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { CodexTerminalProps } from "../types/codex";

export const CodexTerminal = ({
  children,
  className,
  title,
  ...props
}: CodexTerminalProps) => (
  <Card
    className={cn(
      "bg-codex-bg font-codex text-codex-fg w-full gap-0 overflow-clip rounded-[1.25rem] py-0 text-base antialiased shadow-[0_1.5rem_3.5rem_-1rem_var(--codex-shadow)] ring-0",
      className
    )}
    data-slot="codex-terminal"
    {...props}
  >
    <CardHeader className="bg-codex-titlebar flex shrink-0 items-center gap-3 rounded-none px-4.5 py-3">
      <div aria-hidden="true" className="flex items-center gap-1.5">
        <span className="bg-codex-dot size-2.5 shrink-0 rounded-full" />
        <span className="bg-codex-dot size-2.5 shrink-0 rounded-full" />
        <span className="bg-codex-dot size-2.5 shrink-0 rounded-full" />
      </div>
      {title && (
        <CardTitle className="text-codex-title truncate text-xs leading-4 font-normal">
          {title}
        </CardTitle>
      )}
    </CardHeader>
    <ScrollArea className="min-h-0 flex-1">
      <CardContent className="flex flex-col gap-[1.0625rem] p-4 sm:p-5">
        {children}
      </CardContent>
    </ScrollArea>
  </Card>
);
