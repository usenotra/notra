"use client";

import { cn } from "cn";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { CHATGPT_PRO_SPARKLES } from "../constants/chatgpt";
import {
  CHATGPT_EFFORTS,
  CHATGPT_LATEST_MODEL,
  CHATGPT_MEDIUM_EFFORT,
  CHATGPT_MODELS,
} from "../constants/chatgpt-models";
import type {
  ChatgptEffortId,
  ChatgptEffortOption,
  ChatgptModelOption,
  ChatgptModelSelectorProps,
} from "../types/chatgpt";

/** Half the thumb width, so dots line up with where the thumb stops. */
const BURST_MS = 1000;
const THUMB_INSET = "0.875rem";

const PRO_EFFORT_ID: ChatgptEffortId = "pro";

const sliderClassName = [
  "[&_[data-slot=slider-track]]:bg-chatgpt-slider-track [&_[data-slot=slider-track]]:h-6",
  "[&_[data-slot=slider-range]]:bg-chatgpt-slider-fill [&_[data-slot=slider-range]]:before:absolute [&_[data-slot=slider-range]]:before:inset-0 [&_[data-slot=slider-range]]:before:bg-(image:--chatgpt-pro-gradient) [&_[data-slot=slider-range]]:before:opacity-0 [&_[data-slot=slider-range]]:before:transition-opacity [&_[data-slot=slider-range]]:before:duration-500 group-data-[pro=true]/slider:[&_[data-slot=slider-range]]:before:opacity-100",
  // Ease the thumb and fill between stops, but follow the pointer 1:1 while dragging.
  "[&_[data-slot=slider-thumb]]:transition-[inset-inline-start,left,scale] [&_[data-slot=slider-thumb]]:duration-300 [&_[data-slot=slider-thumb]]:ease-[cubic-bezier(0.22,1,0.36,1)] [&_[data-slot=slider-range]]:transition-[width,inset-inline-start] [&_[data-slot=slider-range]]:duration-300 [&_[data-slot=slider-range]]:ease-[cubic-bezier(0.22,1,0.36,1)]",
  "data-dragging:[&_[data-slot=slider-thumb]]:transition-none data-dragging:[&_[data-slot=slider-range]]:transition-none motion-reduce:[&_[data-slot=slider-thumb]]:transition-none motion-reduce:[&_[data-slot=slider-range]]:transition-none [&_[data-slot=slider-thumb]]:active:scale-95",
  "[&_[data-slot=slider-thumb]]:bg-chatgpt-slider-thumb [&_[data-slot=slider-thumb]]:size-7 [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:shadow-[0_2px_8px_rgb(0_0_0/0.35)] [&_[data-slot=slider-thumb]]:ring-0 [&_[data-slot=slider-thumb]]:hover:ring-0 [&_[data-slot=slider-thumb]]:active:ring-0 [&_[data-slot=slider-thumb]]:focus-visible:ring-2 [&_[data-slot=slider-thumb]]:focus-visible:ring-chatgpt-focus/60",
].join(" ");

const effortText = (
  effort: ChatgptEffortOption,
  model: ChatgptModelOption,
  { compact }: { compact: boolean }
) => {
  if (effort.id !== PRO_EFFORT_ID) {
    return <span>{effort.label}</span>;
  }
  const prefix =
    compact && model.id === CHATGPT_LATEST_MODEL.id ? null : model.shortLabel;

  return (
    <span>
      {prefix ? `${prefix} ` : null}
      <span className="text-chatgpt-pro">{effort.label}</span>
    </span>
  );
};

interface ModelListProps {
  model: ChatgptModelOption["id"];
  models: readonly ChatgptModelOption[];
  onSelect: (model: ChatgptModelOption) => void;
}

const ModelList = ({ model, models, onSelect }: ModelListProps) => (
  <ToggleGroup
    aria-label="Model"
    className="w-full rounded-none"
    onValueChange={(next) => {
      const chosen = models.find((item) => item.id === next[0]);
      if (chosen) {
        onSelect(chosen);
      }
    }}
    orientation="vertical"
    spacing={0}
    value={[model]}
  >
    {models.map((item) => (
      <ToggleGroupItem
        className="text-chatgpt-fg hover:bg-chatgpt-hover hover:text-chatgpt-fg focus-visible:ring-chatgpt-focus/35 dark:hover:bg-chatgpt-hover h-auto w-full justify-between gap-3 rounded-xl border-0 px-3 py-2 text-start text-[0.9375rem] leading-5 font-normal focus-visible:ring-2 aria-pressed:bg-transparent data-pressed:bg-transparent"
        key={item.id}
        value={item.id}
      >
        <span className="flex flex-col">
          <span>{item.label}</span>
          {item.description ? (
            <span className="text-chatgpt-muted text-sm">
              {item.description}
            </span>
          ) : null}
        </span>
        {item.id === model ? (
          <CheckIcon aria-hidden="true" className="size-4" strokeWidth={1.75} />
        ) : null}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);

export const ChatgptModelSelector = ({
  className,
  effort,
  efforts = CHATGPT_EFFORTS,
  model,
  models = CHATGPT_MODELS,
  onEffortChange,
  onModelChange,
  ...props
}: ChatgptModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"effort" | "models">("effort");

  const selectedModel =
    models.find((item) => item.id === model) ??
    models[0] ??
    CHATGPT_LATEST_MODEL;
  const effortIndex = Math.max(
    efforts.findIndex((item) => item.id === effort),
    0
  );
  const selectedEffort =
    efforts[effortIndex] ?? efforts[0] ?? CHATGPT_MEDIUM_EFFORT;
  const isPro = selectedEffort.id === PRO_EFFORT_ID;
  const lastIndex = Math.max(efforts.length - 1, 1);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setView("effort");
    }
  };

  // The burst plays once when the slider lands on Pro, not whenever the view remounts.
  const [burstActive, setBurstActive] = useState(false);
  useEffect(() => {
    if (!burstActive) {
      return;
    }
    const timer = window.setTimeout(() => setBurstActive(false), BURST_MS);
    return () => window.clearTimeout(timer);
  }, [burstActive]);

  const handleSlide = (value: number | readonly number[]) => {
    const index = Array.isArray(value) ? value[0] : value;
    const next = efforts[index as number];
    if (next && next.id !== effort) {
      setBurstActive(next.id === PRO_EFFORT_ID);
      onEffortChange?.(next.id);
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={`Thinking effort: ${selectedEffort.label}`}
            className={cn(
              "group/chatgpt-model text-chatgpt-muted hover:bg-chatgpt-hover hover:text-chatgpt-fg focus-visible:ring-chatgpt-focus/35 aria-expanded:bg-chatgpt-hover aria-expanded:text-chatgpt-fg dark:hover:bg-chatgpt-hover h-9 gap-1.5 rounded-full border-0 bg-transparent px-4 text-[0.9375rem] leading-none font-normal transition-[background-color,scale] duration-150 focus-visible:ring-2 active:scale-[0.96] active:not-aria-[haspopup]:translate-y-0 motion-reduce:transition-none",
              className
            )}
            data-slot="chatgpt-model-selector"
            variant="ghost"
            {...props}
          />
        }
      >
        {open ? (
          <span>Thinking effort</span>
        ) : (
          effortText(selectedEffort, selectedModel, { compact: true })
        )}
        <ChevronDownIcon
          aria-hidden="true"
          className="text-chatgpt-muted size-4 transition-transform duration-150 group-aria-expanded/chatgpt-model:rotate-180 motion-reduce:transition-none"
          strokeWidth={1.75}
        />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="bg-chatgpt-popover font-chatgpt text-chatgpt-fg shadow-chatgpt-menu data-open:zoom-in-90 data-closed:zoom-out-90 w-64 gap-2 rounded-3xl p-3 ring-0 duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-0"
        side="top"
        sideOffset={8}
      >
        {view === "effort" ? (
          <>
            <Button
              aria-label={`Model: ${selectedModel.label}. Change model`}
              className="text-chatgpt-fg hover:bg-chatgpt-hover hover:text-chatgpt-fg focus-visible:ring-chatgpt-focus/35 dark:hover:bg-chatgpt-hover mx-auto h-8 gap-1 rounded-full border-0 px-3 text-base leading-none font-normal focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0"
              onClick={() => setView("models")}
              variant="ghost"
            >
              {effortText(selectedEffort, selectedModel, { compact: false })}
              <ChevronRightIcon
                aria-hidden="true"
                className="text-chatgpt-muted size-3.5"
                strokeWidth={2}
              />
            </Button>
            <div
              className="group/slider relative px-0.5 pt-0.5 pb-1"
              data-pro={isPro}
              data-slot="chatgpt-effort-slider"
            >
              <Slider
                className={sliderClassName}
                aria-label="Thinking effort"
                max={efforts.length - 1}
                min={0}
                onValueChange={handleSlide}
                step={1}
                value={effortIndex}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0.5 top-0.5 bottom-1 z-10"
              >
                {efforts.map((item, index) =>
                  index === effortIndex ? null : (
                    <span
                      className={cn(
                        "absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-300",
                        index < effortIndex
                          ? "bg-chatgpt-slider-dot-fill"
                          : "bg-chatgpt-slider-dot"
                      )}
                      key={item.id}
                      style={{
                        left: `calc(${THUMB_INSET} + (100% - 2 * ${THUMB_INSET}) * ${index / lastIndex})`,
                      }}
                    />
                  )
                )}
              </div>
              {isPro && burstActive ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0.5 top-0.5 bottom-1 z-10"
                >
                  <div
                    className="absolute size-0"
                    style={{ left: `calc(100% - ${THUMB_INSET})`, top: "50%" }}
                  >
                    {CHATGPT_PRO_SPARKLES.map((sparkle) => (
                      <span
                        className="animate-chatgpt-burst bg-chatgpt-pro absolute -top-px -left-px rounded-full opacity-0 motion-reduce:hidden"
                        key={`${sparkle.x}:${sparkle.y}`}
                        style={
                          {
                            "--burst-x": `${sparkle.x}px`,
                            "--burst-y": `${sparkle.y}px`,
                            animationDelay: `${sparkle.delay}ms`,
                            height: sparkle.size,
                            width: sparkle.size,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <ModelList
            model={selectedModel.id}
            models={models}
            onSelect={(next) => {
              onModelChange?.(next.id);
              setView("effort");
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
};
