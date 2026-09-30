"use client";

import {
  OPENCODE_PROGRESS_CELLS,
  OPENCODE_PROGRESS_FRAME_MS,
  OPENCODE_PROGRESS_TRAIL,
} from "@notra/ui/constants/opencode-skin";
import { useOpencodeFrame } from "@notra/ui/hooks/use-opencode-frame";
import { cn } from "@notra/ui/lib/utils";
import type { OpencodeProgressProps } from "@notra/ui/types/opencode-skin";
import { useReducedMotion } from "motion/react";

const LAST_CELL = OPENCODE_PROGRESS_CELLS - 1;
const TRAIL_LENGTH = OPENCODE_PROGRESS_TRAIL.length;
/**
 * The head sweeps from the first cell to the last and back to the first,
 * then keeps moving off the left edge so the trail drains into cell 0.
 */
const SWEEP_FRAMES = LAST_CELL * 2 + TRAIL_LENGTH;
/** The sweep, then the same number of frames at rest as the trail is long. */
const FRAME_COUNT = SWEEP_FRAMES + TRAIL_LENGTH;
const CELLS = Array.from({ length: OPENCODE_PROGRESS_CELLS }, (_, cell) => cell);

function cellOpacity(cell: number, frame: number): number | null {
  if (frame >= SWEEP_FRAMES) {
    return null;
  }
  const forward = frame <= LAST_CELL;
  const head = forward ? frame : LAST_CELL * 2 - frame;
  const behind = forward ? head - cell : cell - head;
  return OPENCODE_PROGRESS_TRAIL[behind] ?? null;
}

export function OpencodeProgress({
  active = true,
  reducedMotion,
  className,
}: OpencodeProgressProps) {
  const prefersReduced = useReducedMotion();
  const animate = active && !(reducedMotion ?? prefersReduced);
  const frame = useOpencodeFrame(
    FRAME_COUNT,
    OPENCODE_PROGRESS_FRAME_MS,
    animate
  );

  return (
    <span
      aria-hidden
      className={cn("inline-flex h-5 shrink-0 items-center", className)}
    >
      {CELLS.map((cell) => {
        const opacity = animate ? cellOpacity(cell, frame) : null;
        return (
          <span className="grid h-[0.9em] w-[1ch] place-items-center" key={cell}>
            {opacity === null ? (
              <span className="size-0.5 bg-opencode-tui-blue opacity-40" />
            ) : (
              <span className="size-full bg-opencode-tui-blue" style={{ opacity }} />
            )}
          </span>
        );
      })}
    </span>
  );
}
