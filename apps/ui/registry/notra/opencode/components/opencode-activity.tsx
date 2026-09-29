"use client";

import { cn } from "cn";

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

import type { OpencodeActivityProps } from "../types/opencode";

const ACTIVITY_ICONS = { read: "→", thought: "+", tool: "⚙" } as const;

export const OpencodeActivity = ({
  children,
  className,
  defaultOpen = false,
  detail,
  duration,
  kind = "tool",
  label,
  ...props
}: OpencodeActivityProps) => {
  const isThought = kind === "thought";
  const summary = (
    <>
      {isThought && <span>Thought: </span>}
      <span>{label}</span>
      {detail && <span> [{detail}]</span>}
      {duration && <span> · {duration}</span>}
    </>
  );

  return (
    <Collapsible
      className={cn(
        "font-opencode text-[0.8125rem] leading-[1.3]",
        isThought ? "text-opencode-orange" : "text-opencode-muted",
        className
      )}
      data-kind={kind}
      data-slot="opencode-activity"
      defaultOpen={defaultOpen}
      {...props}
    >
      <Item className="flex-nowrap items-start gap-[1ch] rounded-none border-0 p-0 text-[length:inherit] leading-[inherit]">
        <ItemMedia
          aria-hidden="true"
          className="group-has-data-[slot=item-description]/item:translate-y-0"
        >
          {ACTIVITY_ICONS[kind]}
        </ItemMedia>
        <ItemContent className="min-w-0 gap-0">
          <ItemTitle className="line-clamp-none block w-auto text-[length:inherit] leading-[inherit] font-normal wrap-break-word">
            {children ? (
              <CollapsibleTrigger
                render={
                  <Button
                    className="group/opencode-activity focus-visible:ring-opencode-purple/60 inline h-auto rounded-xs p-0 text-start text-[length:inherit] leading-[inherit] font-normal whitespace-normal text-current hover:bg-transparent hover:text-current focus-visible:border-transparent focus-visible:ring-1 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent aria-expanded:text-current dark:hover:bg-transparent"
                    variant="ghost"
                  />
                }
              >
                {summary}
                <span
                  aria-hidden="true"
                  className="ms-[1ch] inline-block text-[0.625rem] opacity-70 transition-transform duration-150 group-hover/opencode-activity:opacity-100 group-data-panel-open/opencode-activity:rotate-90 motion-reduce:transition-none"
                >
                  ▶
                </span>
              </CollapsibleTrigger>
            ) : (
              summary
            )}
          </ItemTitle>
          {children && (
            <CollapsibleContent>
              <ItemDescription className="text-opencode-muted line-clamp-none text-[length:inherit] leading-[inherit] whitespace-pre-wrap">
                {children}
              </ItemDescription>
            </CollapsibleContent>
          )}
        </ItemContent>
      </Item>
    </Collapsible>
  );
};
