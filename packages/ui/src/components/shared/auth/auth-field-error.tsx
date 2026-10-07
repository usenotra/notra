"use client";

import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import { TRANSITION } from "@notra/ui/lib/motion";
import type { AuthFieldErrorProps } from "../../../types/auth";

export function AuthFieldError({ id, error }: AuthFieldErrorProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-live="polite" id={id}>
      <LazyMotion features={domAnimation} strict>
        <AnimatePresence initial={false}>
          {error && (
            <m.p
              animate={{ opacity: 1, y: 0 }}
              className="text-destructive text-sm"
              exit={{ opacity: 0, y: reduceMotion ? 0 : -2 }}
              initial={{ opacity: 0, y: reduceMotion ? 0 : -2 }}
              transition={reduceMotion ? { duration: 0 } : TRANSITION.fade}
            >
              {error}
            </m.p>
          )}
        </AnimatePresence>
      </LazyMotion>
    </div>
  );
}
