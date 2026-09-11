import type { FC } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Brush marker — the declarative `<Chart.Brush/>` child. Rendering nothing, its
// PRESENCE turns the brush on and its props carry the brush's height, handle-label
// formatter, and range callback. It lives in its own module so the lazy chart
// wrappers can expose it without pulling in ECharts.
// ─────────────────────────────────────────────────────────────────────────────

export interface BrushProps {
  height?: number; // brush preview strip height in px (default 56)
  formatLabel?: (value: string, index: number) => string; // formats the range-handle labels
  onChange?: (range: { startIndex: number; endIndex: number }) => void; // fires as the range moves
}

/** Declares the zoom brush below the chart. Presence renders it; renders nothing itself. */
export const Brush: FC<BrushProps> = () => null;
