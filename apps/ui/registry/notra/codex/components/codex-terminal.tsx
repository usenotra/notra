import { cn } from "cn";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { CodexTerminalProps } from "../types/codex";

export const CodexTerminal = ({
  children,
  className,
  footer,
  title,
  ...props
}: CodexTerminalProps) => (
  <Card
    className={cn(
      "bg-codex-bg font-codex text-codex-fg w-full gap-0 overflow-clip rounded-xl py-0 text-[0.8125rem] leading-[1.3] antialiased shadow-[0_1.5rem_3.5rem_-1rem_var(--codex-shadow)] ring-0",
      className
    )}
    data-slot="codex-terminal"
    {...props}
  >
    <CardHeader className="bg-codex-titlebar relative flex shrink-0 items-center justify-center gap-3 rounded-none px-3 py-2">
      <div
        aria-hidden="true"
        className="absolute start-3 flex items-center gap-2"
      >
        <span className="bg-codex-dot size-3 shrink-0 rounded-full" />
        <span className="bg-codex-dot size-3 shrink-0 rounded-full" />
        <span className="bg-codex-dot size-3 shrink-0 rounded-full" />
      </div>
      {title && (
        <CardTitle className="text-codex-title truncate px-16 text-xs leading-4 font-normal">
          {title}
        </CardTitle>
      )}
    </CardHeader>
    <ScrollArea className="min-h-0 flex-1">
      <CardContent className="flex flex-col gap-[1.3em] px-0 py-[1.3em]">
        {children}
      </CardContent>
    </ScrollArea>
    {footer && <div className="shrink-0 pb-[0.65em]">{footer}</div>}
  </Card>
);
