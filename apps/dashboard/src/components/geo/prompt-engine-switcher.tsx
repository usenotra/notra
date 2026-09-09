"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  GlobalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import type { PromptEngineSwitcherProps } from "@/types/geo";
import {
  engineAnswerMode,
  formatEngineFamily,
  formatEngineWithMode,
  sharedEngineAnswerMode,
} from "@/utils/geo-charts";
import { adjacentPromptEngine } from "@/utils/geo-prompt-engines";

const COUNTER_TRANSITION = {
  type: "spring",
  bounce: 0,
  duration: 0.25,
} as const;
const INSTANT = { duration: 0 } as const;

function engineLabel(engine: string, answerMode: string | null): string {
  return answerMode ? formatEngineFamily(engine) : formatEngineWithMode(engine);
}

function SearchModeIcon() {
  return (
    <HugeiconsIcon
      aria-hidden="true"
      className="text-muted-foreground size-3 shrink-0"
      icon={GlobalIcon}
      strokeWidth={2}
    />
  );
}

export function PromptEngineSwitcher({
  results,
  active,
  onChange,
}: PromptEngineSwitcherProps) {
  const engines = results.map((result) => result.engine);
  const answerMode = sharedEngineAnswerMode(engines);
  const activeIndex = engines.indexOf(active.engine);
  const reduceMotion = useReducedMotion();
  const counterTransition = reduceMotion ? INSTANT : COUNTER_TRANSITION;
  const showsSearchIcon = (engine: string) =>
    answerMode === null && engineAnswerMode(engine) !== null;

  if (results.length === 1) {
    return (
      <div className="flex min-w-0 flex-1 items-center">
        <span className="bg-background inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-lg border px-2.5 text-[0.8rem] font-medium">
          <EngineIcon className="size-3.5 shrink-0" engine={active.engine} />
          <span className="truncate">
            {formatEngineWithMode(active.engine)}
          </span>
          {engineAnswerMode(active.engine) !== null ? <SearchModeIcon /> : null}
        </span>
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Engine: ${engineLabel(active.engine, answerMode)}`}
                className="max-w-full min-w-0"
                size="sm"
                variant="outline"
              />
            }
          >
            <EngineIcon className="size-3.5 shrink-0" engine={active.engine} />
            <span className="truncate">
              {engineLabel(active.engine, answerMode)}
            </span>
            {showsSearchIcon(active.engine) ? <SearchModeIcon /> : null}
            <span
              className={`text-muted-foreground/70 items-center text-xs tabular-nums ${results.length > 1 ? "inline-flex" : "hidden"}`}
            >
              <AnimatePresence initial={false} mode="popLayout">
                <m.span
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  initial={{ opacity: 0, y: 4 }}
                  key={activeIndex}
                  transition={counterTransition}
                >
                  {activeIndex + 1}
                </m.span>
              </AnimatePresence>
              <span className="mx-0.5 opacity-60">/</span>
              <span>{results.length}</span>
            </span>
            <HugeiconsIcon
              aria-hidden="true"
              className="text-muted-foreground size-3.5 shrink-0"
              icon={ArrowDown01Icon}
              strokeWidth={2}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-[min(60vh,24rem)] w-64 overflow-y-auto"
          >
            <DropdownMenuRadioGroup
              onValueChange={(next) => {
                const nextIndex = engines.indexOf(next);
                onChange(next, nextIndex >= activeIndex ? 1 : -1);
              }}
              value={active.engine}
            >
              {results.map((result) => (
                <DropdownMenuRadioItem
                  closeOnClick
                  key={result.engine}
                  value={result.engine}
                >
                  <EngineIcon className="size-3.5" engine={result.engine} />
                  <span className="truncate">
                    {engineLabel(result.engine, answerMode)}
                  </span>
                  {showsSearchIcon(result.engine) ? <SearchModeIcon /> : null}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {results.length > 1 ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              aria-label="Previous engine"
              onClick={() =>
                onChange(adjacentPromptEngine(engines, active.engine, -1), -1)
              }
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            </Button>
            <Button
              aria-label="Next engine"
              onClick={() =>
                onChange(adjacentPromptEngine(engines, active.engine, 1), 1)
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
    </LazyMotion>
  );
}
