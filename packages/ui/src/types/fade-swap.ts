import type { ReactNode } from "react";

export interface FadeSwapProps {
  /** Identity of the content; a new key swaps the old content out. */
  swapKey: string;
  /** Numeric value behind the content; a drop reverses the swap direction. */
  value?: number;
  children: ReactNode;
  className?: string;
}
