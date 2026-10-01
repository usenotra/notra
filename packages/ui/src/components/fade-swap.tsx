"use client";

import type { FadeSwapProps } from "@notra/ui/types/fade-swap";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { cn } from "../lib/utils";

const BLUR = "blur(6px)";
const SHARP = "blur(0px)";
const OFFSET_EM = 0.5;
/*
 * A mild standard curve: strong ease-outs land almost everything in the first
 * frames (a snap), long in-outs drag. This sits between the two.
 */
const SWAP_EASE = [0.4, 0, 0.2, 1] as const;
export const FADE_SWAP_TRANSITION = { duration: 0.35, ease: SWAP_EASE };

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
      <AnimatePresence custom={direction} initial={false} mode="popLayout">
        <motion.span
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
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
