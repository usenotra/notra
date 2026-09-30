"use client";

import { cn } from "@notra/ui/lib/utils";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Fragment, useState } from "react";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const BLUR_IN = "blur(4px)";
const BLUR_NONE = "blur(0px)";
const WORD_STAGGER_S = 0.022;
const DIGIT_PATTERN = /\d/;

/**
 * Text that crossfades with a short blur whenever it changes. The live value
 * is read from a visually hidden copy so screen readers never hear the
 * outgoing text.
 */
export function FadeText({
  text,
  className,
  wrap = false,
}: {
  text: string;
  className?: string;
  /** Let the text wrap onto several lines instead of staying on one. */
  wrap?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={cn("relative", wrap ? "grid" : "inline-grid", className)}>
      <span className="sr-only">{text}</span>
      <AnimatePresence initial={false} mode="popLayout">
        <m.span
          animate={{ opacity: 1, y: 0, filter: BLUR_NONE }}
          aria-hidden="true"
          className={cn(
            "col-start-1 row-start-1",
            wrap ? "whitespace-normal" : "whitespace-nowrap"
          )}
          exit={{ opacity: 0, y: "-0.25em", filter: BLUR_IN }}
          initial={{ opacity: 0, y: "0.25em", filter: BLUR_IN }}
          key={text}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
          {text}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * A number whose changed digits roll in, like a counter: up when the value
 * grows, down when it shrinks. Unchanged digits stay put.
 */
export function RollingNumber({
  value,
  numeric,
  className,
}: {
  /** The formatted string to show, e.g. "4,500" or "$250". */
  value: string;
  /** The raw number, used only to pick the roll direction. */
  numeric: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  // Derived during render from the last value (React's "adjust state on
  // prop change" pattern), so the roll knows which way to go.
  const [previous, setPrevious] = useState(numeric);
  const [direction, setDirection] = useState(1);
  if (numeric !== previous) {
    setDirection(numeric > previous ? 1 : -1);
    setPrevious(numeric);
  }

  if (shouldReduceMotion) {
    return <span className={className}>{value}</span>;
  }

  // Keyed from the right so digits keep their slot when the length changes.
  const chars = [...value];

  return (
    <span className={cn("relative inline-flex tabular-nums", className)}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="inline-flex overflow-hidden">
        {chars.map((char, index) => {
          const slot = chars.length - index;
          const isDigit = DIGIT_PATTERN.test(char);

          if (!isDigit) {
            return <span key={`static-${slot}`}>{char}</span>;
          }

          return (
            <span className="relative inline-grid" key={`slot-${slot}`}>
              <AnimatePresence
                custom={direction}
                initial={false}
                mode="popLayout"
              >
                <m.span
                  animate={{ y: 0, opacity: 1, filter: BLUR_NONE }}
                  className="col-start-1 row-start-1"
                  custom={direction}
                  exit={{
                    y: `${-direction * 70}%`,
                    opacity: 0,
                    filter: BLUR_IN,
                  }}
                  initial={{
                    y: `${direction * 70}%`,
                    opacity: 0,
                    filter: BLUR_IN,
                  }}
                  key={char}
                  transition={{ duration: 0.32, ease: EASE_OUT }}
                >
                  {char}
                </m.span>
              </AnimatePresence>
            </span>
          );
        })}
      </span>
    </span>
  );
}

/**
 * A caption that swaps word by word: the old line fades up and out while the
 * new words rise in with a small stagger.
 */
export function StaggeredCaption({
  id,
  lead,
  rest,
  className,
  leadClassName,
}: {
  /** Changes whenever the caption should re-enter. */
  id: string | number;
  lead: string;
  rest: string;
  className?: string;
  leadClassName?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <p className={className}>
        <span className={leadClassName}>{lead}</span> {rest}
      </p>
    );
  }

  const words = [
    ...lead.split(" ").map((word) => ({ word, isLead: true })),
    ...rest.split(" ").map((word) => ({ word, isLead: false })),
  ];

  return (
    <p className={cn("relative", className)}>
      <span className="sr-only">
        {lead} {rest}
      </span>
      <AnimatePresence initial={false} mode="popLayout">
        <m.span
          aria-hidden="true"
          className="block"
          exit={{ opacity: 0, y: "-0.3em", filter: BLUR_IN }}
          key={id}
          transition={{ duration: 0.18, ease: EASE_OUT }}
        >
          {words.map(({ word, isLead }, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: words can repeat
            <Fragment key={`${word}-${index}`}>
              <m.span
                animate={{ opacity: 1, y: 0, filter: BLUR_NONE }}
                className={cn("inline-block", isLead && leadClassName)}
                initial={{ opacity: 0, y: "0.4em", filter: BLUR_IN }}
                transition={{
                  duration: 0.32,
                  ease: EASE_OUT,
                  delay: index * WORD_STAGGER_S,
                }}
              >
                {word}
              </m.span>{" "}
            </Fragment>
          ))}
        </m.span>
      </AnimatePresence>
    </p>
  );
}
