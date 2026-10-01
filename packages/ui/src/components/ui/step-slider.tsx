"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@notra/ui/lib/utils";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import { nearestStepIndex, stepRatio } from "@notra/ui/lib/step-slider";
import type { StepSliderProps } from "@notra/ui/types/step-slider";

/** Stops closer than this to the thumb sit under it and are not drawn. */
const STOP_UNDER_THUMB = 0.01;

/** Center of a stop from the inline start, inset by the thumb radius so the ends line up with the thumb. */
const stopCenter = (ratio: number) => `calc(1rem + ${ratio} * (100% - 2rem))`;

/** Mask positions of the dot band, from before the fill's start to past its end. */
const SWEEP_FROM = -60;
const SWEEP_TO = 160;
const SWEEP_KEYFRAMES: Keyframe[] = [
  { maskPosition: `${SWEEP_FROM}% 0` },
  { maskPosition: `${SWEEP_TO}% 0` },
];
const SWEEP_TIMING: KeyframeAnimationOptions = {
  duration: 900,
  easing: "ease-out",
};
/**
 * Progress at which the band's leading edge reaches the end of the fill
 * (mask position 100%). Past it the band only trails out of view.
 */
const SWEEP_PAST_FILL = (100 - SWEEP_FROM) / (SWEEP_TO - SWEEP_FROM);
/** Two bands, so a fresh sweep can start while the last one trails out. */
const SWEEP_BANDS = [0, 1] as const;

const defaultFormatLabel = (value: number) => value;

export const StepSlider = ({
  steps,
  value,
  defaultValue,
  onValueChange,
  onValueCommitted,
  formatLabel = defaultFormatLabel,
  majorSteps,
  hideLabels = false,
  getValueText,
  positionOf,
  disabled,
  name,
  form,
  className,
  "aria-label": ariaLabel,
  ...props
}: StepSliderProps) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue ?? steps[0] ?? 0
  );
  const current = value ?? uncontrolledValue;
  const index = nearestStepIndex(steps, current);
  const lastIndex = Math.max(steps.length - 1, 0);
  const position = Math.min(
    Math.max(positionOf?.(current) ?? index, 0),
    lastIndex
  );
  const ratio = lastIndex > 0 ? position / lastIndex : 0;

  const sweepBands = useRef<(HTMLSpanElement | null)[]>([]);
  const sweeps = useRef<(Animation | undefined)[]>([]);
  const activeSweep = useRef(0);

  // A band still crossing the fill keeps going, so fast stepping never cuts
  // it off or restarts it. Its mask is relative to the fill, so it runs
  // across the new width too. Once it has crossed, the next step sends a
  // fresh band on the other layer while the old one trails out.
  useEffect(() => {
    const active = sweeps.current[activeSweep.current];
    const isRunning = active?.playState === "running";
    const progress = active?.effect?.getComputedTiming().progress ?? 1;
    if (isRunning && progress < SWEEP_PAST_FILL) {
      return;
    }

    const next = isRunning ? 1 - activeSweep.current : activeSweep.current;
    const band = sweepBands.current[next];
    if (!band?.animate) {
      return;
    }
    sweeps.current[next]?.cancel();
    sweeps.current[next] = band.animate(SWEEP_KEYFRAMES, SWEEP_TIMING);
    activeSweep.current = next;
  }, [current]);

  useEffect(
    () => () => {
      for (const sweep of sweeps.current) {
        sweep?.cancel();
      }
    },
    []
  );

  const majorStepSet = majorSteps ? new Set(majorSteps) : null;

  const select = (nextIndex: number) => {
    const next = steps[nextIndex];
    if (next === undefined || next === current) {
      return;
    }
    setUncontrolledValue(next);
    onValueChange?.(next);
  };

  const commit = (nextIndex: number) => {
    const next = steps[nextIndex];
    if (next !== undefined) {
      onValueCommitted?.(next);
    }
  };

  return (
    <SliderPrimitive.Root
      className={cn("@container flex w-full flex-col gap-3", className)}
      data-slot="step-slider"
      disabled={disabled}
      max={lastIndex}
      min={0}
      // Keys move from a between-stops position by whole steps, so round back onto one.
      onValueChange={(nextIndex) => select(Math.round(nextIndex))}
      onValueCommitted={(nextIndex) => commit(Math.round(nextIndex))}
      step={1}
      thumbAlignment="edge"
      value={position}
      {...props}
    >
      {/* Base UI works on step indices, so the form gets the shown step from here. */}
      {name ? (
        <input
          disabled={disabled}
          form={form}
          name={name}
          type="hidden"
          value={steps[index] ?? current}
        />
      ) : null}
      <div className="h-10 rounded-full bg-[#F1F1F2] p-1 shadow-[inset_0_0.0625rem_0.125rem_#1E1E1E0F] dark:bg-white/[0.06]">
        <SliderPrimitive.Control className="relative h-full cursor-pointer touch-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-50">
          <SliderPrimitive.Track className="absolute inset-0 h-full">
            <SliderPrimitive.Indicator
              className="box-content overflow-hidden rounded-full bg-linear-to-b from-violet-500 to-violet-600 pe-4 shadow-[inset_0_0.0625rem_0_#FFFFFF33] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              data-slot="step-slider-indicator"
            >
              <span className="absolute inset-0 bg-[radial-gradient(circle,#FFFFFF2E_0.75px,transparent_1.25px)] bg-size-[0.375rem_0.375rem] bg-center" />
              {SWEEP_BANDS.map((band) => (
                <span
                  className="absolute inset-0 bg-[radial-gradient(circle,#FFFFFFE6_0.9px,transparent_1.4px)] [mask-image:linear-gradient(90deg,transparent,#000_50%,transparent)] bg-size-[0.375rem_0.375rem] bg-center [mask-size:30%_100%] [mask-position:-60%_0] [mask-repeat:no-repeat] motion-reduce:hidden"
                  data-slot="step-slider-sweep"
                  key={band}
                  ref={(element) => {
                    sweepBands.current[band] = element;
                  }}
                />
              ))}
            </SliderPrimitive.Indicator>

            {steps.map((step, stepIndex) => {
              const stopPosition = stepRatio(stepIndex, steps.length);
              if (Math.abs(stopPosition - ratio) < STOP_UNDER_THUMB) {
                return null;
              }

              return (
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute start-(--stop) top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-300 rtl:translate-x-1/2",
                    stopPosition < ratio
                      ? "bg-white/70"
                      : "bg-[#1E1E1E33] dark:bg-white/30"
                  )}
                  key={step}
                  style={{ "--stop": stopCenter(stopPosition) } as CSSProperties}
                />
              );
            })}
          </SliderPrimitive.Track>

          <SliderPrimitive.Thumb
            aria-label={ariaLabel}
            className="group/thumb size-8 rounded-full transition-[inset-inline-start] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none motion-reduce:transition-none"
            data-slot="step-slider-thumb"
            getAriaValueText={(_formatted, stepIndex) => {
              const step = steps[stepIndex] ?? current;
              return getValueText?.(step) ?? String(step);
            }}
          >
            {/* The face scales on its own so Base UI keeps measuring the full thumb. */}
            <span className="block size-full rounded-full bg-linear-to-b from-white to-[#F2F2F2] shadow-[0_0.0625rem_0.25rem_#28282840,0_0_0_0.0625rem_#1E1E1E0D] transition-[scale,box-shadow] duration-200 ease-out group-has-focus-visible/thumb:ring-[0.1875rem] group-has-focus-visible/thumb:ring-violet-500/40 group-data-dragging/thumb:scale-[0.96]" />
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Control>
      </div>

      {hideLabels ? null : (
        <div className="relative mx-1 h-4 text-xs tracking-[-0.01em] text-[#1E1E1E80] tabular-nums dark:text-white/45">
          {steps.map((step, stepIndex) => {
            const isMajor = majorStepSet?.has(step) ?? true;

            return (
              <button
                className={cn(
                  "absolute start-(--stop) top-0 -translate-x-1/2 cursor-pointer transition-colors duration-100 hover:text-[#1E1E1E] disabled:pointer-events-none rtl:translate-x-1/2 dark:hover:text-white",
                  // Narrow containers keep the major labels only.
                  !isMajor && "hidden @lg:block",
                  steps[stepIndex] === current &&
                    "font-medium text-[#1E1E1E] dark:text-white"
                )}
                disabled={disabled}
                key={step}
                onClick={() => {
                  if (steps[stepIndex] !== current) {
                    select(stepIndex);
                    commit(stepIndex);
                  }
                }}
                style={
                  {
                    "--stop": stopCenter(stepRatio(stepIndex, steps.length)),
                  } as CSSProperties
                }
                tabIndex={-1}
                type="button"
              >
                {formatLabel(step)}
              </button>
            );
          })}
        </div>
      )}
    </SliderPrimitive.Root>
  );
};
