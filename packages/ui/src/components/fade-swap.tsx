"use client";

import { FADE_SWAP_TRANSITION } from "@notra/ui/constants/fade-swap";
import type { FadeSwapProps } from "@notra/ui/types/fade-swap";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import { useState } from "react";

import { cn } from "../lib/utils";

const BLUR = "blur(6px)";
const SHARP = "blur(0px)";
const OFFSET_EM = 0.5;

// Direction comes in through `custom` so the outgoing copy, whose props are
// frozen at removal, still leaves the way the new value is heading.
const VARIANTS = {
  enter: (direction: number) => ({
    opacity: 0,
    y: `${direction * OFFSET_EM}em`,
    filter: BLUR,
  }),
  center: { opacity: 1, y: 0, filter: SHARP },
  exit: (direction: number) => ({
    opacity: 0,
    y: `${-direction * OFFSET_EM}em`,
    filter: BLUR,
  }),
};

/**
 * Swaps its content as one unit: the old value lifts out with a blur while
 * the new one rises in from below (reversed when `value` drops). The
 * outgoing copy is popped out of layout, so the box takes the new size at once
 * and nothing is clipped mid-swap.
 */
export function FadeSwap({
  swapKey,
  value,
  children,
  className,
}: FadeSwapProps) {
  const reduceMotion = useReducedMotion();
  // Adjusted during render ("state from previous props") so the very render
  // that swaps the key already knows which way to move.
  const [previousValue, setPreviousValue] = useState(value);
  const [direction, setDirection] = useState(1);
  if (value !== previousValue) {
    setPreviousValue(value);
    if (value !== undefined && previousValue !== undefined) {
      setDirection(value >= previousValue ? 1 : -1);
    }
  }

  if (reduceMotion) {
    return <span className={cn("inline-flex", className)}>{children}</span>;
  }

  return (
    <span className={cn("relative inline-grid", className)}>
      <LazyMotion features={domAnimation} strict>
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          <m.span
          animate="center"
          className="col-start-1 row-start-1 inline-flex whitespace-nowrap"
          custom={direction}
          exit="exit"
          initial="enter"
          key={swapKey}
          transition={FADE_SWAP_TRANSITION}
          variants={VARIANTS}
        >
          {children}
          </m.span>
        </AnimatePresence>
      </LazyMotion>
    </span>
  );
}
