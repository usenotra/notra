"use client";

import { cn } from "cn";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import { GEMINI_SPARKLE_CYCLE_MS } from "../constants/gemini";
import { useGeminiReducedMotion } from "../hooks/use-gemini-reduced-motion";
import type { GeminiSparkleProps } from "../types/gemini";

const VIEW = 24;
const DOT_R = 2.15;
const BOUNCE_END = 0.4;
const MORPH_IN_END = 0.56;
const HOLD_END = 0.7;
const MORPH_OUT_END = 0.86;
const BOUNCE_HEIGHT = 2.4;
const BOUNCE_GROWTH = 0.08;
const BOUNCES_PER_CYCLE = 5;

interface Point {
  x: number;
  y: number;
}

const LINE: readonly Point[] = [
  { x: 6, y: 13.2 },
  { x: 12, y: 13.2 },
  { x: 18, y: 13.2 },
];

const TRIANGLE: readonly Point[] = [
  { x: 7.2, y: 15.8 },
  { x: 12, y: 6.8 },
  { x: 16.8, y: 15.8 },
];

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

const morphAmount = (progress: number) => {
  if (progress < BOUNCE_END) {
    return 0;
  }
  if (progress < MORPH_IN_END) {
    return easeInOut((progress - BOUNCE_END) / (MORPH_IN_END - BOUNCE_END));
  }
  if (progress < HOLD_END) {
    return 1;
  }
  if (progress < MORPH_OUT_END) {
    return 1 - easeInOut((progress - HOLD_END) / (MORPH_OUT_END - HOLD_END));
  }
  return 0;
};

const bounceLift = (progress: number, index: number, morph: number) => {
  const wave = Math.max(
    0,
    Math.sin((progress * BOUNCES_PER_CYCLE - index / 3) * Math.PI * 2)
  );
  const rest = 1 - morph;
  return wave * wave * rest * rest;
};

const GeminiSparkleMark = ({ progress }: { progress: number }) => {
  const morph = morphAmount(progress);

  return (
    <svg
      aria-hidden="true"
      className="size-full"
      fill="currentColor"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
    >
      {LINE.map((from, index) => {
        const to = TRIANGLE[index] ?? from;
        const bounce = bounceLift(progress, index, morph);
        return (
          <circle
            cx={lerp(from.x, to.x, morph)}
            cy={lerp(from.y, to.y, morph) - bounce * BOUNCE_HEIGHT}
            key={from.x}
            r={DOT_R * (1 + bounce * BOUNCE_GROWTH)}
          />
        );
      })}
    </svg>
  );
};

export const GeminiSparkle = ({
  animated = false,
  className,
  reducedMotion,
  size = 18,
  style,
  ...props
}: GeminiSparkleProps) => {
  const prefersReducedMotion = useGeminiReducedMotion();
  const shouldAnimate = animated && !(reducedMotion ?? prefersReducedMotion);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!shouldAnimate) {
      setProgress(0);
      return;
    }

    const started = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      setProgress(
        ((now - started) % GEMINI_SPARKLE_CYCLE_MS) / GEMINI_SPARKLE_CYCLE_MS
      );
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [shouldAnimate]);

  return (
    <span
      className={cn(
        "text-gemini-fg inline-flex size-(--gemini-sparkle-size) shrink-0 items-center justify-center",
        className
      )}
      aria-hidden={animated ? undefined : true}
      aria-label={animated ? "Loading" : undefined}
      data-animated={shouldAnimate || undefined}
      data-slot="gemini-sparkle"
      role={animated ? "status" : undefined}
      style={
        { "--gemini-sparkle-size": `${size}px`, ...style } as CSSProperties
      }
      {...props}
    >
      <GeminiSparkleMark progress={shouldAnimate ? progress : 0} />
    </span>
  );
};
