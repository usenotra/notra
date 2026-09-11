"use client";

import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import type { ReactNode } from "react";

import { TRANSITION } from "@notra/ui/lib/motion";

const ENTER_OFFSET = 6;

/**
 * Cross-fades between steps of a small flow. Re-keys on `stepKey`, so the
 * outgoing step slides up while the incoming one settles from below.
 */
export function StepTransition({
  stepKey,
  children,
  className,
}: {
  stepKey: string;
  children: ReactNode;
  className?: string;
}) {
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
