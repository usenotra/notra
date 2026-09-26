"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";

import type { OfferingTraceStepProps } from "@/types/offering-check";

export function OfferingTraceStep({
  icon,
  label,
  meta,
  children,
}: OfferingTraceStepProps) {
  return (
    <Collapsible className="flex flex-col" defaultOpen>
      <CollapsibleTrigger className="group text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 self-start rounded-sm text-left text-[14px] leading-6 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]">
        <HugeiconsIcon
          className="size-4 shrink-0"
          icon={icon}
          strokeWidth={1.75}
        />
        {label}
        {meta ? (
          <span className="font-normal tabular-nums opacity-70">{meta}</span>
        ) : null}
        <HugeiconsIcon
          className="size-3.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
          icon={ArrowDown01Icon}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[ending-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:h-0 data-[starting-style]:opacity-0 motion-reduce:transition-none">
        <div className="pt-1.5 pl-6">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
