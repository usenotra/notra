import { tween } from "@notra/ui/lib/motion";

export const NAVBAR_PANEL_ENTER = { opacity: 0, y: -4, scale: 0.97 } as const;
export const NAVBAR_PANEL_REST = { opacity: 1, y: 0, scale: 1 } as const;
export const NAVBAR_PANEL_EXIT = { opacity: 0, y: -2, scale: 0.99 } as const;

// Position and dimensions share a clock so the surface stays anchored as it resizes.
export const NAVBAR_MORPH_TRANSITION = tween("normal", "emphasized");
export const NAVBAR_ENTER_TRANSITION = tween("normal", "emphasized");
export const NAVBAR_EXIT_TRANSITION = tween("fast", "emphasized");

export const NAVBAR_CONTENT_VARIANTS = {
  enter: (direction: number) => ({
    x: direction * 12,
    opacity: 0,
    filter: "blur(2px)",
    pointerEvents: "none" as const,
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
    pointerEvents: "none" as const,
    transitionEnd: { pointerEvents: "auto" as const },
  },
  exit: (direction: number) => ({
    x: direction * -4,
    opacity: direction === 0 ? 1 : 0,
    filter: direction === 0 ? "blur(0px)" : "blur(2px)",
    pointerEvents: "none" as const,
    transition: direction === 0 ? { duration: 0 } : tween("fast", "emphasized"),
  }),
};
