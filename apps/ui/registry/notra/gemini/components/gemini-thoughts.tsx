"use client";

import { cn } from "cn";
import { ChevronDownIcon, SearchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  GEMINI_HIDE_THINKING_LABEL,
  GEMINI_SHOW_THINKING_LABEL,
} from "../constants/gemini";
import type { GeminiThoughtsProps } from "../types/gemini";

/** Pairs each item with a key that stays unique when steps repeat. */
const withOccurrenceKeys = <T,>(
  items: readonly T[],
  getKey: (item: T) => string
) => {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = getKey(item);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return [item, `${base}#${count}`] as const;
  });
};

export const GeminiThoughts = ({
  className,
  hideLabel = GEMINI_HIDE_THINKING_LABEL,
  showLabel = GEMINI_SHOW_THINKING_LABEL,
  steps,
  ...props
}: GeminiThoughtsProps) => (
  <Collapsible
    className={cn("group/gemini-thoughts font-gemini w-full", className)}
    data-slot="gemini-thoughts"
    {...props}
  >
    <CollapsibleTrigger
      render={
        <Button
          className="text-gemini-muted hover:bg-gemini-hover hover:text-gemini-fg focus-visible:ring-gemini-focus/30 aria-expanded:text-gemini-fg dark:hover:bg-gemini-hover -ms-2 h-8 gap-2 rounded-full border-0 px-2 text-[0.9375rem] leading-5 font-normal focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0 [&[data-panel-open]>svg:last-child]:rotate-180"
          variant="ghost"
        />
      }
    >
      <span className="group-data-open/gemini-thoughts:hidden">
        {showLabel}
      </span>
      <span className="hidden group-data-open/gemini-thoughts:inline">
        {hideLabel}
      </span>
      <ChevronDownIcon
        aria-hidden="true"
        className="size-4 transition-transform duration-200 motion-reduce:transition-none"
        strokeWidth={1.5}
      />
    </CollapsibleTrigger>
    <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 motion-reduce:transition-none">
      <div className="border-gemini-separator text-gemini-muted mt-2 flex flex-col gap-3 border-s-2 ps-4 text-[0.875rem] leading-6">
        {withOccurrenceKeys(steps, (item) =>
          item.kind === "thought" ? item.text : item.queries.join("|")
        ).map(([step, key]) =>
          step.kind === "thought" ? (
            <p key={key}>{step.text}</p>
          ) : (
            <div className="flex flex-col gap-2" key={key}>
              <span className="text-gemini-fg flex items-center gap-2 text-[0.8125rem] leading-5">
                <SearchIcon
                  aria-hidden="true"
                  className="size-3.5"
                  strokeWidth={1.75}
                />
                Searching the web
              </span>
              <span className="flex flex-wrap gap-1.5">
                {step.queries.map((query) => (
                  <Badge
                    className="border-gemini-separator text-gemini-muted h-auto rounded-full bg-transparent px-2.5 py-0.5 text-[0.8125rem] leading-5 font-normal"
                    key={query}
                    variant="outline"
                  >
                    {query}
                  </Badge>
                ))}
              </span>
            </div>
          )
        )}
      </div>
    </CollapsibleContent>
  </Collapsible>
);
