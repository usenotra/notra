import {
  TOOLTIP_MOVE_DURATION_S,
  TOOLTIP_MOVE_EASING,
} from "@/constants/chart-tooltip";

// The size morph only makes sense for a deliberate jump. While the pointer is
// sweeping, the content changes every few frames; restarting the 160 ms morph
// each time would pin the box in its first, clipped frames.
const SIZE_MOTION_SETTLE_MS = 300;

export function withTooltipSizeMotion(formatter: (params: unknown) => string) {
  let container: HTMLDivElement | undefined;
  let animation: Animation | undefined;
  let lastHtml = "";
  let lastChangeAt = 0;

  return (params: unknown): string | HTMLElement => {
    const html = formatter(params);
    if (!html || typeof document === "undefined") {
      animation?.cancel();
      lastHtml = "";
      return html;
    }
    container ??= document.createElement("div");
    // ECharts calls the formatter on every pointer move. Identical content must
    // not touch the DOM, or a running morph restarts from its first frame.
    if (html === lastHtml && container.firstElementChild) {
      return container;
    }
    const now = performance.now();
    const settled = now - lastChangeAt > SIZE_MOTION_SETTLE_MS;
    lastChangeAt = now;
    lastHtml = html;
    const previous = container.firstElementChild?.getBoundingClientRect();
    animation?.cancel();
    container.style.width = "";
    container.style.height = "";
    container.innerHTML = html;
    const surface = container.firstElementChild;
    if (
      settled &&
      surface instanceof HTMLElement &&
      previous &&
      previous.width > 0 &&
      previous.height > 0 &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const next = surface.getBoundingClientRect();
      container.style.width = `${next.width}px`;
      container.style.height = `${next.height}px`;
      if (previous.width !== next.width || previous.height !== next.height) {
        queueMicrotask(() => {
          if (
            container?.firstElementChild !== surface ||
            !container.isConnected
          ) {
            return;
          }
          animation = surface.animate(
            [
              {
                "--ec-tooltip-scale-x": previous.width / next.width,
                "--ec-tooltip-scale-y": previous.height / next.height,
              },
              { "--ec-tooltip-scale-x": 1, "--ec-tooltip-scale-y": 1 },
            ],
            {
              duration: TOOLTIP_MOVE_DURATION_S * 1000,
              easing: TOOLTIP_MOVE_EASING,
            }
          );
        });
      }
    }
    return container;
  };
}
