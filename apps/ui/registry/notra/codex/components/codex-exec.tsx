"use client";

import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

import {
  CODEX_EXEC_STATUS_CLASS,
  CODEX_EXEC_STATUS_LABEL,
} from "../constants/codex";
import type { CodexExecProps } from "../types/codex";

export const CodexExec = ({
  className,
  command,
  defaultOpen = false,
  output,
  status = "ran",
  ...props
}: CodexExecProps) => {
  const summary = (
    <>
      <Badge
        className={cn(
          "text-codex-fg inline h-auto rounded-none border-0 bg-transparent p-0 align-baseline text-[length:inherit] leading-[inherit] font-bold"
        )}
      >
        {CODEX_EXEC_STATUS_LABEL[status]}
      </Badge>
      <span> {command}</span>
    </>
  );

  return (
    <Collapsible
      className={cn(
        "font-codex text-codex-fg text-[0.8125rem] leading-[1.3]",
        className
      )}
      data-slot="codex-exec"
      data-status={status}
      defaultOpen={defaultOpen}
      {...props}
    >
      <Item className="flex-nowrap items-baseline gap-[1ch] rounded-none border-0 p-0 text-[length:inherit] leading-[inherit]">
        <ItemMedia
          aria-hidden="true"
          className={cn(
            "group-has-data-[slot=item-description]/item:translate-y-0 group-has-data-[slot=item-description]/item:self-auto",
            CODEX_EXEC_STATUS_CLASS[status]
          )}
        >
          •
        </ItemMedia>
        <ItemContent className="min-w-0 gap-0">
          <ItemTitle className="line-clamp-none block w-auto text-[length:inherit] leading-[inherit] font-normal wrap-break-word">
            {output ? (
              <CollapsibleTrigger
                render={
                  <Button
                    className="group/codex-exec hover:text-codex-fg aria-expanded:text-codex-fg focus-visible:ring-codex-green/60 inline h-auto rounded-xs p-0 text-start text-[length:inherit] leading-[inherit] font-normal whitespace-normal hover:bg-transparent focus-visible:border-transparent focus-visible:ring-1 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent"
                    variant="ghost"
                  />
                }
              >
                {summary}
                <span
                  aria-hidden="true"
                  className="text-codex-dim ms-[1ch] inline-block transition-transform duration-150 group-data-panel-open/codex-exec:rotate-90 motion-reduce:transition-none"
                >
                  ▸
                </span>
              </CollapsibleTrigger>
            ) : (
              summary
            )}
          </ItemTitle>
          {output && (
            <CollapsibleContent>
              <ItemDescription className="text-codex-dim line-clamp-none grid grid-cols-[2ch_minmax(0,1fr)] text-[length:inherit] leading-[inherit] whitespace-pre-wrap">
                <span aria-hidden="true">└</span>
                <span>{output}</span>
              </ItemDescription>
            </CollapsibleContent>
          )}
        </ItemContent>
      </Item>
    </Collapsible>
  );
};
