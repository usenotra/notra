"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useState } from "react";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import { PromptEngineSwitcher } from "@/components/geo/prompt-engine-switcher";
import { DESIGN_SYSTEM_ENGINE_RESULTS } from "@/constants/design-system-engine-switcher";
import { cn } from "@/lib/utils";
import type {
  EngineMenuDemoProps,
  PromptEngineSwitcherProps,
} from "@/types/geo";
import { formatEngineFamily } from "@/utils/geo-charts";
import { adjacentPromptEngine } from "@/utils/geo-prompt-engines";

function EngineMenu({
  results,
  active,
  onChange,
  className,
  showCounter = true,
}: EngineMenuDemoProps) {
  const engines = results.map((result) => result.engine);
  const activeIndex = engines.indexOf(active.engine);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className={cn("min-w-0 active:scale-100", className)}
            size="sm"
            variant="outline"
          />
        }
      >
        <EngineIcon className="size-3.5 shrink-0" engine={active.engine} />
        <span className="flex-1 truncate text-left">
          {formatEngineFamily(active.engine)}
        </span>
        {showCounter ? (
          <span className="text-muted-foreground/70 text-xs tabular-nums">
            {activeIndex + 1}/{results.length}
          </span>
        ) : null}
        <HugeiconsIcon
          aria-hidden="true"
          className="text-muted-foreground size-3.5 shrink-0"
          icon={ArrowDown01Icon}
          strokeWidth={2}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuRadioGroup
          onValueChange={(next) => onChange(next, 1)}
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
                {formatEngineFamily(result.engine)}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StepButtons({ results, active, onChange }: PromptEngineSwitcherProps) {
  const engines = results.map((result) => result.engine);
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        aria-label="Previous engine"
        onClick={() =>
          onChange(adjacentPromptEngine(engines, active.engine, -1), -1)
        }
        size="icon-sm"
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
        variant="ghost"
      >
        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
      </Button>
    </div>
  );
}

function ArrowsFirst(props: PromptEngineSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <StepButtons {...props} />
      <EngineMenu {...props} />
    </div>
  );
}

function FixedWidth(props: PromptEngineSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <EngineMenu {...props} className="w-60" />
      <StepButtons {...props} />
    </div>
  );
}

function SplitEnds(props: PromptEngineSwitcherProps) {
  const { results, active } = props;
  const activeIndex = results.findIndex(
    (result) => result.engine === active.engine
  );
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <EngineMenu {...props} showCounter={false} />
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-muted-foreground text-xs tabular-nums">
          {activeIndex + 1} / {results.length}
        </span>
        <StepButtons {...props} />
      </div>
    </div>
  );
}

function IconTabs({ results, active, onChange }: PromptEngineSwitcherProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted flex items-center gap-0.5 rounded-lg p-0.5">
        {results.map((result) => (
          <Tooltip key={result.engine}>
            <TooltipTrigger
              render={
                <button
                  aria-label={formatEngineFamily(result.engine)}
                  aria-pressed={result.engine === active.engine}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md transition-colors",
                    result.engine === active.engine
                      ? "bg-background shadow-xs"
                      : "opacity-60 hover:opacity-100"
                  )}
                  onClick={() => onChange(result.engine, 1)}
                  type="button"
                />
              }
            >
              <EngineIcon className="size-3.5" engine={result.engine} />
            </TooltipTrigger>
            <TooltipContent>{formatEngineFamily(result.engine)}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <span className="truncate text-sm font-medium">
        {formatEngineFamily(active.engine)}
      </span>
    </div>
  );
}

const VARIANTS = [
  {
    title: "1. Arrows first",
    note: "Arrows sit left of the menu, so a changing label only grows to the right.",
    Component: ArrowsFirst,
  },
  {
    title: "2. Fixed-width trigger",
    note: "Trigger gets a fixed width and truncates; arrows never move.",
    Component: FixedWidth,
  },
  {
    title: "3. Segmented stepper (shipped)",
    note: "One fixed-width control: prev | menu | next. Reads as a single unit.",
    Component: PromptEngineSwitcher,
  },
  {
    title: "4. Split ends",
    note: "Menu on the left, counter + arrows pinned to the right edge of the row.",
    Component: SplitEnds,
  },
  {
    title: "5. Icon tabs",
    note: "Every engine visible as an icon tab; no arrows needed. Label trails at the end.",
    Component: IconTabs,
  },
] as const;

export default function EngineSwitcherDesignSystemClientPage() {
  const [engine, setEngine] = useState<string>(
    DESIGN_SYSTEM_ENGINE_RESULTS[0].engine
  );
  const props: PromptEngineSwitcherProps = {
    results: DESIGN_SYSTEM_ENGINE_RESULTS,
    active: { engine },
    onChange: (next) => setEngine(next),
  };

  return (
    <main className="bg-muted/30 min-h-screen space-y-6 p-8 lg:p-12">
      <h1 className="text-lg font-semibold">Engine switcher explorations</h1>
      {VARIANTS.map(({ title, note, Component }) => (
        <section
          className="bg-background max-w-xl space-y-3 rounded-xl border p-4"
          key={title}
        >
          <div>
            <h2 className="text-sm font-medium">{title}</h2>
            <p className="text-muted-foreground text-xs">{note}</p>
          </div>
          <Component {...props} />
        </section>
      ))}
    </main>
  );
}
