"use client";

import { useEffect, useState } from "react";

/**
 * Steps through `frameCount` animation frames every `intervalMs` while
 * `active`. Returns frame 0 when inactive, so paused animations rest.
 */
export function useOpencodeFrame(
  frameCount: number,
  intervalMs: number,
  active: boolean
): number {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!active || frameCount < 2) {
      return;
    }
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % frameCount);
    }, intervalMs);
    return () => {
      window.clearInterval(timer);
      setFrame(0);
    };
  }, [active, frameCount, intervalMs]);

  return active ? frame : 0;
}
