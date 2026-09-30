"use client";

import { cn } from "cn";
import type { CSSProperties } from "react";

import {
  OPENCODE_PROGRESS_CELLS,
  OPENCODE_PROGRESS_FRAME_MS,
  OPENCODE_PROGRESS_TRAIL,
} from "../constants/opencode";
import { useOpencodeFrame } from "../hooks/use-opencode-frame";
import { useOpencodeReducedMotion } from "../hooks/use-opencode-reduced-motion";
import type { OpencodeProgressProps } from "../types/opencode";

const LAST_CELL = OPENCODE_PROGRESS_CELLS - 1;
/** One sweep right and one back, then the same number of frames at rest. */
const SWEEP_FRAMES = LAST_CELL * 2;
const FRAME_COUNT = SWEEP_FRAMES + OPENCODE_PROGRESS_TRAIL.length;
const CELLS = Array.from(
  { length: OPENCODE_PROGRESS_CELLS },
  (_, cell) => cell
);

/** Opacity of `cell` on `frame`, or null when the cell rests as a dot. */
const cellOpacity = (cell: number, frame: number): number | null => {
  if (frame >= SWEEP_FRAMES) {
    return null;
  }
  const forward = frame < LAST_CELL;
  const head = forward ? frame : SWEEP_FRAMES - frame;
  const behind = forward ? head - cell : cell - head;
  return OPENCODE_PROGRESS_TRAIL[behind] ?? null;
};

export const OpencodeProgress = ({
  active = true,
  className,
  reducedMotion,
  ...props
}: OpencodeProgressProps) => {
  const reduced = useOpencodeReducedMotion(reducedMotion);
  const animate = active && !reduced;
  const frame = useOpencodeFrame(
    FRAME_COUNT,
    OPENCODE_PROGRESS_FRAME_MS,
    animate
  );

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex h-[1lh] shrink-0 items-center", className)}
      data-slot="opencode-progress"
      {...props}
    >
      {CELLS.map((cell) => {
        const opacity = animate ? cellOpacity(cell, frame) : null;
        return (
          <span
            className="grid h-[0.9em] w-[1ch] place-items-center"
            key={cell}
          >
            {opacity === null ? (
              <span className="bg-opencode-blue size-0.5 opacity-40" />
            ) : (
              <span
                className="bg-opencode-blue size-full opacity-(--opencode-cell)"
                style={{ "--opencode-cell": opacity } as CSSProperties}
              />
            )}
          </span>
        );
      })}
    </span>
  );
};
