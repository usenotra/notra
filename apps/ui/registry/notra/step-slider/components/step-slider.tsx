"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "cn";
import { type CSSProperties, useState } from "react";

import { nearestStepIndex, stepRatio } from "../lib/step-slider";
import type { StepSliderProps } from "../types/step-slider";

/** Stops closer than this to the thumb sit under it and are not drawn. */
const STOP_UNDER_THUMB = 0.001;

/** Center of a stop from the inline start, inset by the thumb radius so the ends line up with the thumb. */
const stopCenter = (ratio: number) => `calc(1rem + ${ratio} * (100% - 2rem))`;

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
  const ratio = stepRatio(index, steps.length);
  const lastIndex = Math.max(steps.length - 1, 0);

  const majorStepSet = majorSteps ? new Set(majorSteps) : null;

  const select = (nextIndex: number) => {
    const next = steps[nextIndex];
    if (next === undefined || nextIndex === index) {
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
      onValueChange={(nextIndex) => select(nextIndex)}
      onValueCommitted={(nextIndex) => commit(nextIndex)}
      step={1}
      thumbAlignment="edge"
      value={index}
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
              {/* Remounts on every step so the dots sweep again. */}
              <span
                className="animate-step-slider-sweep absolute inset-0 bg-[radial-gradient(circle,#FFFFFFE6_0.9px,transparent_1.4px)] [mask-image:linear-gradient(90deg,transparent,#000_50%,transparent)] bg-size-[0.375rem_0.375rem] bg-center [mask-size:30%_100%] [mask-position:-60%_0] [mask-repeat:no-repeat] motion-reduce:hidden"
                key={index}
              />
            </SliderPrimitive.Indicator>

            {steps.map((step, stepIndex) => {
              const position = stepRatio(stepIndex, steps.length);
              if (Math.abs(position - ratio) < STOP_UNDER_THUMB) {
                return null;
              }

              return (
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute start-(--stop) top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-300 rtl:translate-x-1/2",
                    position < ratio
                      ? "bg-white/70"
                      : "bg-[#1E1E1E33] dark:bg-white/30"
                  )}
                  key={step}
                  style={{ "--stop": stopCenter(position) } as CSSProperties}
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
                  stepIndex === index &&
                    "font-medium text-[#1E1E1E] dark:text-white"
                )}
                disabled={disabled}
                key={step}
                onClick={() => {
                  if (stepIndex !== index) {
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
