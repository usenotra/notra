export const TOC_DEPTHS = [2, 3] as const;
export const TOC_SCROLL_OFFSET_PX = 48;
export const TOC_PATH_TRACK_WIDTH = 20;
export const TOC_X_BY_DEPTH: Record<number, number> = {
  2: 1,
  3: 13,
};
export const TOC_FALLBACK_X = 1;
export const TOC_TRANSITION_INSET = 5;
export const TOC_SCROLL_LOCK_FALLBACK_MS = 900;
export const TOC_STICKY_OFFSET_PX = 40;
