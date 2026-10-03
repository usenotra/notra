"use client";

import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";

import { TRANSITION } from "@notra/ui/lib/motion";
import type { StepTransitionProps } from "../../../types/security";

const ENTER_OFFSET = 6;

export function StepTransition({
  stepKey,
  children,
  className,
}: StepTransitionProps) {
  const reduceMotion = useReducedMotion();
  const offset = reduceMotion ? 0 : ENTER_OFFSET;

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence initial={false} mode="wait">
        <m.div
          animate={{ opacity: 1, y: 0 }}
          className={className}
          exit={{ opacity: 0, y: -offset }}
          initial={{ opacity: 0, y: offset }}
          key={stepKey}
          transition={reduceMotion ? { duration: 0 } : TRANSITION.enter}
        >
          {children}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
