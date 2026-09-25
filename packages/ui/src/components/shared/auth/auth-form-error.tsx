"use client";

import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@notra/ui/lib/utils";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import { TRANSITION } from "@notra/ui/lib/motion";
import type { AuthFormErrorProps } from "../../../types/auth";

export function AuthFormError({ error, className }: AuthFormErrorProps) {
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence initial={false}>
        {error && (
          <m.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            role="alert"
            transition={reduceMotion ? { duration: 0 } : TRANSITION.fade}
          >
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-destructive text-sm",
                className
              )}
            >
              <HugeiconsIcon
                className="mt-0.5 size-4 shrink-0"
                icon={AlertCircleIcon}
              />
              <p>{error}</p>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
