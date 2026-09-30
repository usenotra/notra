"use client";

import { cn } from "@notra/ui/lib/utils";
import { useEffect, useState } from "react";

const VIEW = 24;
const DOT_R = 2.15;
const CYCLE_MS = 3400;
const BOUNCE_END = 0.4;
const MORPH_IN_END = 0.56;
const HOLD_END = 0.7;
const MORPH_OUT_END = 0.86;

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

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function morphAmount(progress: number) {
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
}

function bounceLift(progress: number, index: number, morph: number) {
  const wave = Math.max(
    0,
    Math.sin((progress * 5 - index / 3) * Math.PI * 2)
  );
  const rest = 1 - morph;
  return wave * wave * rest * rest;
}

function GeminiSparkleMark({ progress }: { progress: number }) {
  const morph = morphAmount(progress);

  return (
    <svg
      aria-hidden
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
            cy={lerp(from.y, to.y, morph) - bounce * 2.4}
            key={from.x}
            r={DOT_R * (1 + bounce * 0.08)}
          />
        );
      })}
    </svg>
  );
}

export function GeminiSparkle({
  animated = false,
  reducedMotion = false,
  className,
  size = 18,
}: {
  animated?: boolean;
  reducedMotion?: boolean;
  className?: string;
  size?: number;
}) {
  const shouldAnimate = animated && !reducedMotion;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!shouldAnimate) {
      setProgress(0);
      return;
    }

    const started = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      setProgress(((now - started) % CYCLE_MS) / CYCLE_MS);
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
        "inline-flex shrink-0 items-center justify-center text-[#1f1f1f] dark:text-foreground",
        className
      )}
      style={{ width: size, height: size }}
    >
      <GeminiSparkleMark progress={shouldAnimate ? progress : 0} />
    </span>
  );
}
