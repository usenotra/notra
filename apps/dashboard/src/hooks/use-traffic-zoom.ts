"use client";

import { useCallback, useEffect, useState } from "react";

import type { ChartRangeSelection } from "@/components/evilcharts/charts/echarts-area-chart";

interface ZoomRange {
  from: number;
  to: number;
  /** The date range the zoom was made on, so a new range drops it. */
  key: string;
}

const TYPING_TAGS = /^(input|textarea|select)$/i;

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || TYPING_TAGS.test(target.tagName))
  );
}

/**
 * Drag-to-zoom over a list of rows. The zoom keeps absolute row indices, so a
 * second drag inside a zoom stacks on the first. Escape resets it. With
 * `enabled` false there is no `onRangeSelect`, so the chart does not offer a drag.
 */
export function useTrafficZoom<Row>(
  rows: Row[],
  rangeKey: string,
  enabled: boolean
) {
  const [zoom, setZoom] = useState<ZoomRange | null>(null);
  const active = zoom?.key === rangeKey ? zoom : null;
  const offset = active?.from ?? 0;
  const visibleRows = active ? rows.slice(active.from, active.to + 1) : rows;
  const zoomed = active !== null;

  const applyZoom = useCallback(
    (selection: ChartRangeSelection) => {
      setZoom({
        from: offset + selection.startIndex,
        to: offset + selection.endIndex,
        key: rangeKey,
      });
    },
    [offset, rangeKey]
  );
  const resetZoom = useCallback(() => setZoom(null), []);

  useEffect(() => {
    if (!zoomed) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === "Escape" && !isTyping(event.target)) {
        resetZoom();
      }
    };
    // Capture phase: a focused button or the canvas must not swallow Escape.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [zoomed, resetZoom]);

  return {
    visibleRows,
    zoomed,
    resetZoom,
    onRangeSelect: enabled ? applyZoom : undefined,
  };
}
