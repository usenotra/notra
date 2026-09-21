"use client";

import { TRANSITION } from "@notra/ui/lib/motion";
import { AnimatePresence, LazyMotion, m, useReducedMotion } from "motion/react";
import { useId } from "react";

import { EASE_OUT, SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";

const loadMotionFeatures = () =>
  import("@/lib/motion-features").then((mod) => mod.default);

const CHECK_PATH = "M5 13l4 4L19 7";
const INDETERMINATE_PATH = "M6 12h12";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  label?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  indeterminate,
  label,
  className,
  id: idProp,
  "aria-label": ariaLabel,
}: CheckboxProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const reduce = useReducedMotion();
  const showMark = checked || indeterminate;
  const path = indeterminate ? INDETERMINATE_PATH : CHECK_PATH;
  let state = "unchecked";
  if (checked) {
    state = "checked";
  } else if (indeterminate) {
    state = "indeterminate";
  }

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <label
        className={cn(
          "flex items-center gap-3",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
          className
        )}
        htmlFor={id}
      >
        <m.button
          aria-checked={indeterminate ? "mixed" : checked}
          aria-label={ariaLabel}
          className={cn(
            "duration-normal flex size-5 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 p-0 leading-none transition-colors outline-none",
            "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
            showMark
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/50 bg-background hover:border-muted-foreground"
          )}
          data-state={state}
          disabled={disabled}
          id={id}
          onClick={() => !disabled && onCheckedChange(!checked)}
          role="checkbox"
          transition={SPRING_PRESS}
          type="button"
          whileTap={reduce || disabled ? undefined : { scale: 0.92 }}
        >
          <AnimatePresence initial={false}>
            {showMark ? (
              <m.svg
                animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                aria-hidden
                exit={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.5, filter: "blur(4px)" }
                }
                fill="none"
                height="12"
                initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.5 }}
                key={indeterminate ? "indeterminate" : "checked"}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                transition={reduce ? { duration: 0 } : TRANSITION.fade}
                viewBox="0 0 24 24"
                width="12"
              >
                <title>
                  {indeterminate ? "Partially selected" : "Selected"}
                </title>
                <m.path
                  animate={{ pathLength: 1 }}
                  d={path}
                  initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          duration: indeterminate ? 0.2 : 0.3,
                          ease: EASE_OUT,
                          delay: 0.04,
                        }
                  }
                />
              </m.svg>
            ) : null}
          </AnimatePresence>
        </m.button>
        {label ? (
          <span
            className={cn(
              "text-foreground text-sm select-none",
              disabled && "opacity-60"
            )}
          >
            {label}
          </span>
        ) : null}
      </label>
    </LazyMotion>
  );
}
