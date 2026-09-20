"use client";

import { TRANSITION } from "@notra/ui/lib/motion";
import type { AnimatedNumberProps } from "@notra/ui/types/animated-number";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils";

const rest = {
  opacity: 1,
  transform: "translateY(0%)",
  filter: "blur(0px)",
};

/**
 * Rolls only the characters that changed. Each character sits in a slot keyed
 * by its position from the right, so 98 → 99 animates just the last digit and
 * 98 → 107 animates every digit (plus the new leading slot).
 */
export function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const previousValue = useRef(value);
  // New slots (99 → 100) should roll in, but not on the first paint.
  const [hasMounted, setHasMounted] = useState(false);
  const direction = value >= previousValue.current ? 1 : -1;
  const formattedValue = value.toLocaleString();
  const chars = Array.from(formattedValue);

  useEffect(() => {
    previousValue.current = value;
  }, [value]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const offset = reduceMotion ? 0 : 45 * direction;
  const blur = reduceMotion ? "blur(0px)" : "blur(4px)";
  const transition = reduceMotion ? { duration: 0 } : TRANSITION.enter;

  return (
    <span
      className={cn(
        "relative inline-flex overflow-hidden align-baseline tabular-nums",
        className
      )}
    >
      <span className="sr-only">{formattedValue}</span>
      <AnimatePresence initial={false} mode="popLayout">
        {chars.map((char, index) => {
          const slot = chars.length - index;
          return (
            <motion.span
              aria-hidden="true"
              className="relative inline-grid"
              exit={{ opacity: 0 }}
              key={`slot-${slot}`}
              layout="position"
              transition={transition}
            >
              <AnimatePresence initial={hasMounted} mode="popLayout">
                <motion.span
                  animate={rest}
                  className="col-start-1 row-start-1 block"
                  exit={{
                    opacity: 0,
                    transform: `translateY(${-offset}%)`,
                    filter: blur,
                  }}
                  initial={{
                    opacity: 0,
                    transform: `translateY(${offset}%)`,
                    filter: blur,
                  }}
                  key={char}
                  transition={transition}
                >
                  {char}
                </motion.span>
              </AnimatePresence>
            </motion.span>
          );
        })}
      </AnimatePresence>
    </span>
  );
}
