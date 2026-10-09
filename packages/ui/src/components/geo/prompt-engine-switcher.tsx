"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { Button } from "@notra/ui/components/ui/button";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { DEFAULT_PROMPT_ENGINE_SWITCHER_LABELS } from "@notra/ui/constants/geo";
import { adjacentPromptEngine } from "@notra/ui/lib/geo-prompt-engines";
import { SPRING } from "@notra/ui/lib/motion";
import { cn } from "@notra/ui/lib/utils";
import type { PromptEngineSwitcherProps } from "@notra/ui/types/geo";

const INSTANT = { duration: 0 } as const;

export function PromptEngineSwitcher({
  items,
  active,
  onChange,
  labels,
  transition,
  compactOnMobile = false,
}: PromptEngineSwitcherProps) {
  const resolvedLabels = {
    ...DEFAULT_PROMPT_ENGINE_SWITCHER_LABELS,
    ...labels,
  };
  const engines = items.map((item) => item.engine);
  const layoutId = useId();
  const reduceMotion = useReducedMotion();
  const pillTransition = reduceMotion
    ? INSTANT
    : (transition ?? SPRING.indicatorFlat);
  const activeIndex = engines.indexOf(active);

  return (
    <div className="flex items-start gap-3">
      <LayoutGroup id={layoutId}>
        <div
          aria-label={resolvedLabels.engines}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1 p-0.5",
            compactOnMobile ? "max-sm:flex-nowrap sm:flex-wrap" : "flex-wrap"
          )}
          role="tablist"
        >
          {items.map((item, index) => {
            const selected = item.engine === active;
            return (
              <button
                aria-label={item.label}
                aria-selected={selected}
                className={cn(
                  "relative inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm",
                  "transition-[color,transform] duration-fast ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  "active:scale-[0.97]",
                  selected
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                key={item.engine}
                onClick={() =>
                  onChange(item.engine, index >= activeIndex ? 1 : -1)
                }
                role="tab"
                type="button"
              >
                {selected ? (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-muted"
                    layoutId="geo-engine-pill"
                    transition={pillTransition}
                  />
                ) : null}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <EngineIcon className="size-3.5" engine={item.engine} />
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      compactOnMobile && !selected && "max-sm:sr-only"
                    )}
                  >
                    <span>{item.family}</span>
                    {item.showSearchIcon ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span className="inline-flex shrink-0 cursor-default" />
                          }
                        >
                          <HugeiconsIcon
                            aria-hidden="true"
                            className="size-3 shrink-0"
                            icon={Search01Icon}
                            strokeWidth={2}
                          />
                        </TooltipTrigger>
                        <TooltipContent>{resolvedLabels.search}</TooltipContent>
                      </Tooltip>
                    ) : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>
      {items.length > 1 ? (
        <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
          <Button
            aria-label={resolvedLabels.previousEngine}
            onClick={() =>
              onChange(adjacentPromptEngine(engines, active, -1), -1)
            }
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </Button>
          <Button
            aria-label={resolvedLabels.nextEngine}
            onClick={() =>
              onChange(adjacentPromptEngine(engines, active, 1), 1)
            }
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
