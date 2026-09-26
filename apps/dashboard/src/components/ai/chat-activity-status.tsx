"use client";

import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import { BrailleLoader } from "@notra/ui/components/shared/braille-loader";
import { TRANSITION } from "@notra/ui/lib/motion";
import {
  AnimatePresence,
  domMax,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";

import type { ChatActivityStatusProps } from "@/types/components/chat-activity-group";
import { formatElapsedSeconds } from "@/utils/format-elapsed-seconds";

export function ChatActivityStatus({
  children,
  seconds,
  label = "Thinking",
  active = true,
}: ChatActivityStatusProps) {
  const reduceMotion = useReducedMotion();
  return (
    <span className="text-muted-foreground inline-flex min-h-5 items-center gap-2 text-sm leading-5">
      <LazyMotion features={domMax}>
        <span className="relative inline-flex h-5 items-center overflow-hidden">
          <span className="sr-only">{label}</span>
          <AnimatePresence initial={false} mode="popLayout">
            <m.span
              aria-hidden="true"
              className="inline-flex h-5 items-center whitespace-nowrap"
              key={label}
              initial={{
                opacity: 0,
                transform: reduceMotion ? "none" : "translateY(50%)",
              }}
              animate={{
                opacity: 1,
                transform: reduceMotion ? "none" : "translateY(0%)",
              }}
              exit={{
                opacity: 0,
                transform: reduceMotion ? "none" : "translateY(-50%)",
              }}
              transition={TRANSITION.enter}
            >
              {active ? (
                <span className="inline-flex items-center gap-2">
                  <BrailleLoader className="h-5 items-center text-sm leading-5 motion-reduce:[&>span]:animate-none!" />
                  <Shimmer as="span">{label}</Shimmer>
                </span>
              ) : (
                label
              )}
            </m.span>
          </AnimatePresence>
        </span>
        <m.span
          className="inline-flex h-5 shrink-0 items-center gap-1"
          layout={reduceMotion ? false : "position"}
          transition={TRANSITION.enter}
        >
          {active ? (
            <span
              aria-hidden="true"
              className="font-mono text-sm leading-5 tabular-nums"
            >
              {formatElapsedSeconds(seconds)}
            </span>
          ) : null}
          {children}
        </m.span>
      </LazyMotion>
    </span>
  );
}
