"use client";

import { useReducedMotion } from "motion/react";

export function useRightPanelSkipMotion(
  open: boolean,
  expanded: boolean,
  releaseSlotImmediately = false
): boolean {
  const prefersReducedMotion = useReducedMotion() === true;
  return prefersReducedMotion || expanded || releaseSlotImmediately;
}
