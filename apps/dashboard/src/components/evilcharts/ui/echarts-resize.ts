import type { ECharts } from "echarts";

/** Quiet period after the last size change before size-baked textures are rebuilt. */
const CHART_RESIZE_SETTLE_MS = 150;
/** Upper bound for waiting on an idle period before rebuilding anyway. */
const CHART_REPUSH_IDLE_TIMEOUT_MS = 500;

/** Runs `task` when the browser is idle; Safari has no requestIdleCallback. */
function whenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(task, {
      timeout: CHART_REPUSH_IDLE_TIMEOUT_MS,
    });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = setTimeout(task, 0);
  return () => clearTimeout(handle);
}

/**
 * Keeps an ECharts instance sized to its mount without stalling layout
 * animations. A sidebar toggle or window drag changes the mount width every
 * frame; resizing synchronously and rebuilding the option on each of those
 * cost ~40ms per frame. Resizes are coalesced to one per animation frame, and
 * `onSettled` (the expensive option repush) runs once the size stops changing.
 * `onResized` runs with every resize instead, for cheap work that must not lag
 * the new size — overlays drawn outside the option, for one.
 */
export function observeChartResize(
  mount: HTMLElement,
  chart: ECharts,
  callbacks: { onResized?: () => void; onSettled?: () => void } = {}
): () => void {
  const { onResized, onSettled } = callbacks;
  let frame = 0;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  let cancelIdle: (() => void) | undefined;

  const observer = new ResizeObserver(() => {
    if (frame !== 0) {
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      // Observers fire once right after observe(); only react to a real change
      // so the intro reveal is not interrupted.
      if (
        chart.isDisposed() ||
        (mount.clientWidth === chart.getWidth() &&
          mount.clientHeight === chart.getHeight())
      ) {
        return;
      }
      chart.resize({ animation: { duration: 0 } });
      onResized?.();
      if (onSettled) {
        clearTimeout(settleTimer);
        cancelIdle?.();
        settleTimer = setTimeout(() => {
          cancelIdle = whenIdle(() => {
            if (!chart.isDisposed()) {
              onSettled();
            }
          });
        }, CHART_RESIZE_SETTLE_MS);
      }
    });
  });
  observer.observe(mount);

  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(settleTimer);
    cancelIdle?.();
  };
}
