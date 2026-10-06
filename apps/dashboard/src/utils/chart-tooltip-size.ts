import {
  TOOLTIP_MOVE_DURATION_S,
  TOOLTIP_MOVE_EASING,
} from "@/constants/chart-tooltip";

export function withTooltipSizeMotion(formatter: (params: unknown) => string) {
  let container: HTMLDivElement | undefined;
  let animation: Animation | undefined;

  return (params: unknown): string | HTMLElement => {
    const html = formatter(params);
    if (!html || typeof document === "undefined") {
      animation?.cancel();
      return html;
    }
    container ??= document.createElement("div");
    const previous = container.firstElementChild?.getBoundingClientRect();
    animation?.cancel();
    container.style.width = "";
    container.style.height = "";
    container.innerHTML = html;
    const surface = container.firstElementChild;
    if (
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
