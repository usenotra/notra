"use client";

import { cn } from "cn";
import { useEffect, useState } from "react";

import {
  CLAUDE_SPINNER_CENTER,
  CLAUDE_SPINNER_FRAME_MS,
  CLAUDE_SPINNER_FRAMES,
  CLAUDE_SPINNER_SEQUENCE,
  CLAUDE_SPINNER_STATIC_FRAME,
  CLAUDE_SPINNER_VIEWBOX,
} from "../constants/claude";
import { useClaudeReducedMotion } from "../hooks/use-claude-reduced-motion";
import type { ClaudeSpinnerFrame, ClaudeSpinnerProps } from "../types/claude";

const rayPoint = (angle: number, radius: number) => ({
  x: CLAUDE_SPINNER_CENTER + Math.sin(angle) * radius,
  y: CLAUDE_SPINNER_CENTER - Math.cos(angle) * radius,
});

const frameRays = (frame: ClaudeSpinnerFrame) => {
  const jitter = frame.jitter ?? 0;
  return Array.from({ length: frame.rays }, (_, index) => {
    const angle =
      (Math.PI * 2 * index) / frame.rays + Math.sin(index * 2.35) * 0.07;
    const length = frame.outer * (1 + Math.sin(index * 1.7) * jitter);
    return {
      end: rayPoint(angle, length),
      id: `ray-${frame.rays}-${index}`,
      start: rayPoint(angle, frame.inner),
    };
  });
};

const ClaudeStarMark = ({ frame }: { frame: ClaudeSpinnerFrame }) => (
  <svg
    aria-hidden="true"
    className="size-full"
    fill="none"
    viewBox={`0 0 ${CLAUDE_SPINNER_VIEWBOX} ${CLAUDE_SPINNER_VIEWBOX}`}
  >
    {frame.rays === 0 ? (
      <circle
        cx={CLAUDE_SPINNER_CENTER}
        cy={CLAUDE_SPINNER_CENTER}
        fill="currentColor"
        r="1.7"
      />
    ) : (
      frameRays(frame).map((ray) => (
        <line
          key={ray.id}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={frame.strokeWidth}
          x1={ray.start.x}
          x2={ray.end.x}
          y1={ray.start.y}
          y2={ray.end.y}
        />
      ))
    )}
  </svg>
);

export const ClaudeSpinner = ({
  "aria-label": ariaLabel = "Loading",
  animated = false,
  className,
  reducedMotion,
  size = 16,
  style,
  ...props
}: ClaudeSpinnerProps) => {
  const reduced = useClaudeReducedMotion(reducedMotion);
  const shouldAnimate = animated && !reduced;
  const [sequenceIndex, setSequenceIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!shouldAnimate) {
      setSequenceIndex(null);
      return;
    }

    setSequenceIndex(0);
    const id = window.setInterval(() => {
      setSequenceIndex(
        (current) => ((current ?? 0) + 1) % CLAUDE_SPINNER_SEQUENCE.length
      );
    }, CLAUDE_SPINNER_FRAME_MS);

    return () => window.clearInterval(id);
  }, [shouldAnimate]);

  const frameIndex =
    sequenceIndex === null
      ? CLAUDE_SPINNER_STATIC_FRAME
      : (CLAUDE_SPINNER_SEQUENCE[sequenceIndex] ?? CLAUDE_SPINNER_STATIC_FRAME);
  const frame =
    CLAUDE_SPINNER_FRAMES[frameIndex] ??
    CLAUDE_SPINNER_FRAMES[CLAUDE_SPINNER_STATIC_FRAME];

  return (
    <span
      className={cn(
        "text-claude-accent inline-flex shrink-0 items-center justify-center",
        className
      )}
      aria-label={ariaLabel}
      data-slot="claude-spinner"
      role="status"
      style={{ height: size, width: size, ...style }}
      {...props}
    >
      {frame && <ClaudeStarMark frame={frame} />}
    </span>
  );
};
