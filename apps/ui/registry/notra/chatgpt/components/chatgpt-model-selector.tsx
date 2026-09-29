"use client";

import { cn } from "cn";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import {
  CHATGPT_PRO_SPARKLES,
  CHATGPT_PRO_TWINKLES,
} from "../constants/chatgpt";
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
  "[&_[data-slot=slider-range]]:bg-chatgpt-slider-fill [&_[data-slot=slider-range]]:before:absolute [&_[data-slot=slider-range]]:before:inset-0 [&_[data-slot=slider-range]]:before:bg-(image:--chatgpt-pro-gradient) [&_[data-slot=slider-range]]:before:bg-size-[200%_100%] [&_[data-slot=slider-range]]:before:animate-chatgpt-flow motion-reduce:[&_[data-slot=slider-range]]:before:animate-none [&_[data-slot=slider-range]]:before:opacity-0 [&_[data-slot=slider-range]]:before:transition-opacity [&_[data-slot=slider-range]]:before:duration-500 group-data-[pro=true]/slider:[&_[data-slot=slider-range]]:before:opacity-100",
  // Ease the thumb and fill between stops, but follow the pointer 1:1 while dragging.
  "[&_[data-slot=slider-thumb]]:transition-[inset-inline-start,left,scale] [&_[data-slot=slider-thumb]]:duration-300 [&_[data-slot=slider-thumb]]:ease-[cubic-bezier(0.22,1,0.36,1)] [&_[data-slot=slider-range]]:transition-[width,inset-inline-start] [&_[data-slot=slider-range]]:duration-300 [&_[data-slot=slider-range]]:ease-[cubic-bezier(0.22,1,0.36,1)]",
  "group-data-[moving=true]/slider:[&_[data-slot=slider-thumb]]:transition-none group-data-[moving=true]/slider:[&_[data-slot=slider-range]]:transition-none motion-reduce:[&_[data-slot=slider-thumb]]:transition-none motion-reduce:[&_[data-slot=slider-range]]:transition-none [&_[data-slot=slider-thumb]]:active:scale-95",
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

const useElementHeight = () => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    if (!element) {
      return;
    }
    // offsetHeight ignores the popup's zoom-in scale, unlike getBoundingClientRect.
    setHeight(element.offsetHeight);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setHeight((entry.target as HTMLElement).offsetHeight);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [height, setElement] as const;
};

interface ModelListProps {
  model: ChatgptModelOption["id"];
  models: readonly ChatgptModelOption[];
  /** Called with `undefined` when the selected model is pressed again. */
  onSelect: (model: ChatgptModelOption | undefined) => void;
}

const ModelList = ({ model, models, onSelect }: ModelListProps) => (
  <ToggleGroup
    aria-label="Model"
    className="w-full rounded-none"
    onValueChange={(next) => {
      const chosen = models.find((item) => item.id === next[0]);
      onSelect(chosen);
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
  // Both views stay mounted in one grid cell, so the popup never changes size. Only the
  // background card animates its height, which avoids the positioner lagging a frame behind.
  const [effortHeight, effortRef] = useElementHeight();
  const [modelsHeight, modelsRef] = useElementHeight();
  const cardHeight = view === "effort" ? effortHeight : modelsHeight;

  // The card only animates after its first measurement, so opening never plays a resize.
  const [cardReady, setCardReady] = useState(false);
  useEffect(() => {
    if (!open) {
      setCardReady(false);
      return;
    }
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setCardReady(true))
    );
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const [moving, setMoving] = useState(false);

  const changeView = (next: "effort" | "models") => setView(next);

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
        className="font-chatgpt text-chatgpt-fg data-open:zoom-in-90 data-closed:zoom-out-90 w-64 gap-0 rounded-3xl bg-transparent p-0 shadow-none ring-0 duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-0"
        side="top"
        sideOffset={8}
      >
        <div className="relative grid">
          <div
            aria-hidden="true"
            className={cn(
              "bg-chatgpt-popover shadow-chatgpt-menu absolute inset-x-0 bottom-0 rounded-3xl",
              cardReady &&
                "transition-[height] duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
            )}
            style={{ height: cardHeight ?? "100%" }}
          />
          <div
            className={cn(
              "relative col-start-1 row-start-1 flex flex-col gap-2 self-end p-3 transition-[opacity,filter,translate] motion-reduce:transition-none",
              view === "effort"
                ? "blur-0 translate-y-0 opacity-100 delay-150 duration-300 ease-out"
                : "pointer-events-none translate-y-1 opacity-0 blur-[2px] duration-150 ease-in"
            )}
            inert={view !== "effort"}
            ref={effortRef}
          >
            <Button
              aria-label={`Model: ${selectedModel.label}. Change model`}
              className="text-chatgpt-fg hover:bg-chatgpt-hover hover:text-chatgpt-fg focus-visible:ring-chatgpt-focus/35 dark:hover:bg-chatgpt-hover mx-auto h-8 gap-1 rounded-full border-0 px-3 text-base leading-none font-normal focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0"
              onClick={() => changeView("models")}
              variant="ghost"
            >
              {effortText(selectedEffort, selectedModel, {
                compact: false,
              })}
              <ChevronRightIcon
                aria-hidden="true"
                className="text-chatgpt-muted size-3.5"
                strokeWidth={2}
              />
            </Button>
            <div
              className="group/slider relative px-0.5 pt-0.5 pb-1"
              data-moving={moving}
              data-pro={isPro}
              data-slot="chatgpt-effort-slider"
              // Clicking a stop eases the thumb there; only a real drag follows the pointer 1:1.
              onPointerCancel={() => setMoving(false)}
              onPointerDown={() => setMoving(false)}
              onPointerMove={(event) => {
                if (event.buttons > 0) {
                  setMoving(true);
                }
              }}
              onPointerUp={() => setMoving(false)}
            >
              <Slider
                className={sliderClassName}
                aria-label="Thinking effort"
                max={efforts.length - 1}
                min={0}
                onValueChange={handleSlide}
                step={1}
                value={[effortIndex]}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0.5 top-0.5 bottom-1 z-10 transition-opacity duration-500 group-data-[pro=true]/slider:opacity-0 motion-reduce:transition-none"
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
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0.5 top-0.5 bottom-1 z-10 opacity-0 transition-opacity duration-500 group-data-[pro=true]/slider:opacity-100 motion-reduce:transition-none"
              >
                {CHATGPT_PRO_TWINKLES.map((star) => (
                  <span
                    className="animate-chatgpt-twinkle absolute rounded-full bg-white opacity-0 shadow-[0_0_4px_1px_rgb(255_255_255/0.7)] motion-reduce:animate-none motion-reduce:opacity-60"
                    key={`${star.x}:${star.y}`}
                    style={{
                      animationDelay: `${star.delay}ms`,
                      animationDuration: `${star.duration}ms`,
                      height: star.size,
                      left: `${star.x}%`,
                      top: `${star.y}%`,
                      width: star.size,
                    }}
                  />
                ))}
              </div>
              {isPro && burstActive ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0.5 top-0.5 bottom-1 z-10"
                >
                  <div
                    className="absolute size-0"
                    style={{
                      left: `calc(100% - ${THUMB_INSET})`,
                      top: "50%",
                    }}
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
          </div>
          <div
            className={cn(
              "relative col-start-1 row-start-1 flex flex-col gap-2 self-end p-3 transition-[opacity,filter,translate] motion-reduce:transition-none",
              view === "models"
                ? "blur-0 translate-y-0 opacity-100 delay-150 duration-300 ease-out"
                : "pointer-events-none translate-y-1 opacity-0 blur-[2px] duration-150 ease-in"
            )}
            inert={view !== "models"}
            ref={modelsRef}
          >
            <ModelList
              model={selectedModel.id}
              models={models}
              onSelect={(next) => {
                if (next) {
                  onModelChange?.(next.id);
                }
                changeView("effort");
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
