"use client";

import { cn } from "@notra/ui/lib/utils";
import { useEffect, useState } from "react";

const FRAME_INTERVAL_MS = 120;
const VIEW = 24;
const CX = 12;
const CY = 12;

interface StarFrame {
  rays: number;
  inner: number;
  outer: number;
  strokeWidth: number;
  jitter?: number;
}

const STAR_FRAMES: readonly StarFrame[] = [
  { rays: 0, inner: 0, outer: 0, strokeWidth: 0 },
  { rays: 4, inner: 1.35, outer: 4.4, strokeWidth: 1.55, jitter: 0.08 },
  { rays: 8, inner: 1.45, outer: 5.3, strokeWidth: 1.45, jitter: 0.1 },
  { rays: 6, inner: 1.3, outer: 6.5, strokeWidth: 1.55, jitter: 0.06 },
  { rays: 8, inner: 1.5, outer: 6.9, strokeWidth: 1.5, jitter: 0.12 },
  { rays: 10, inner: 1.65, outer: 7.5, strokeWidth: 1.4, jitter: 0.16 },
];

const FRAME_SEQUENCE = [
  ...STAR_FRAMES.map((_, index) => index),
  ...STAR_FRAMES.map((_, index) => index).reverse().slice(1, -1),
];

const STATIC_FRAME = STAR_FRAMES.length - 1;

function rayPoint(angle: number, radius: number) {
  return {
    x: CX + Math.sin(angle) * radius,
    y: CY - Math.cos(angle) * radius,
  };
}

function StarMark({
  frame,
  className,
}: {
  frame: StarFrame;
  className?: string;
}) {
  if (frame.rays === 0) {
    return (
      <svg
        aria-hidden
        className={className}
        fill="none"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
      >
        <circle cx={CX} cy={CY} fill="currentColor" r="1.7" />
      </svg>
    );
  }

  const jitter = frame.jitter ?? 0;
  const lines = Array.from({ length: frame.rays }, (_, index) => {
    const base = (Math.PI * 2 * index) / frame.rays;
    const wobble = Math.sin(index * 2.35) * 0.07;
    const length = frame.outer * (1 + Math.sin(index * 1.7) * jitter);
    const start = rayPoint(base + wobble, frame.inner);
    const end = rayPoint(base + wobble, length);
    return { start, end };
  });

  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
    >
      {lines.map((line, index) => (
        <line
          key={index}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={frame.strokeWidth}
          x1={line.start.x}
          x2={line.end.x}
          y1={line.start.y}
          y2={line.end.y}
        />
      ))}
    </svg>
  );
}

export function ClaudeChatSpinner({
  animated = false,
  reducedMotion = false,
  className,
  size = 16,
}: {
  animated?: boolean;
  reducedMotion?: boolean;
  className?: string;
  size?: number;
}) {
  const shouldAnimate = animated && !reducedMotion;
  const [frameIndex, setFrameIndex] = useState(STATIC_FRAME);

  useEffect(() => {
    if (!shouldAnimate) {
      setFrameIndex(STATIC_FRAME);
      return;
    }

    setFrameIndex(0);
    const id = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % FRAME_SEQUENCE.length);
    }, FRAME_INTERVAL_MS);

    return () => {
      window.clearInterval(id);
    };
  }, [shouldAnimate]);

  const frame =
    STAR_FRAMES[FRAME_SEQUENCE[frameIndex] ?? STATIC_FRAME] ??
    STAR_FRAMES[STATIC_FRAME];

  if (!frame) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-[#D97757]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <StarMark className="size-full" frame={frame} />
    </span>
  );
}
