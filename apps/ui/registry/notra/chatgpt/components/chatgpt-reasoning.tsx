"use client";

import { cn } from "cn";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { ChatgptReasoningProps } from "../types/chatgpt";
import { ChatgptChevronIcon } from "./chatgpt-icons";

const traceEnterClassName =
  "transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none starting:-translate-y-2 starting:opacity-0";

export const ChatgptReasoning = ({
  children,
  className,
  complete = true,
  defaultOpen,
  onOpenChange,
  open: openProp,
  search,
  seconds,
  ...props
}: ChatgptReasoningProps) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? !complete);
  const [previousComplete, setPreviousComplete] = useState(complete);

  if (previousComplete !== complete) {
    setPreviousComplete(complete);
    setInternalOpen(!complete);
  }

  const label = `Worked for ${seconds}s`;
  const rootClassName = cn(
    "font-chatgpt text-chatgpt-muted text-base leading-7 font-normal",
    className
  );

  if (!(children || search)) {
    return (
      <div className={rootClassName} data-slot="chatgpt-reasoning">
        {label}
      </div>
    );
  }

  return (
    <Collapsible
      className={rootClassName}
      data-slot="chatgpt-reasoning"
      onOpenChange={(next, details) => {
        setInternalOpen(next);
        onOpenChange?.(next, details);
      }}
      open={openProp ?? internalOpen}
      {...props}
    >
      <CollapsibleTrigger
        render={
          <Button
            className="text-chatgpt-muted hover:text-chatgpt-muted aria-expanded:text-chatgpt-muted focus-visible:ring-chatgpt-focus/35 h-auto gap-1 rounded-sm border-0 bg-transparent p-0 text-start text-base leading-7 font-normal hover:bg-transparent focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent [&[data-panel-open]>svg]:rotate-180"
            variant="ghost"
          />
        }
      >
        <span>{label}</span>
        <ChatgptChevronIcon className="size-4 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 motion-reduce:transition-opacity">
        <div className="mt-2 flex flex-col items-start gap-2.5 font-normal">
          {children && <div className={traceEnterClassName}>{children}</div>}
          {search && (
            <div
              className={cn(
                traceEnterClassName,
                "delay-75 motion-reduce:delay-0"
              )}
            >
              {search}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
