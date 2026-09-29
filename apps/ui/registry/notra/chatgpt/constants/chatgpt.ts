export const CHATGPT_TOOLTIP_DELAY_MS = 200;

export const CHATGPT_COPIED_RESET_MS = 1500;

export const CHATGPT_VISIBLE_SITES = 3;

export const CHATGPT_SCROLL_STICK_THRESHOLD_PX = 48;

export const CHATGPT_FAVICON_URL = "https://www.google.com/s2/favicons";

export const CHATGPT_PLAYBACK_TIMING = {
  afterAssistantMs: 480,
  afterInstantMs: 180,
  afterUserMs: 420,
  reducedMaxMs: 70,
  thinkingMs: 1100,
  thinkingWithReasoningMs: 1600,
  tokenMs: 28,
} as const;

/** Offsets from the thumb center in px, plus size in px and animation delay in ms. */
export const CHATGPT_PRO_SPARKLES = [
  { delay: 0, size: 3, x: -34, y: -20 },
  { delay: 260, size: 2, x: -12, y: -26 },
  { delay: 620, size: 4, x: 8, y: -24 },
  { delay: 120, size: 2, x: -46, y: 2 },
  { delay: 480, size: 3, x: 10, y: 22 },
  { delay: 820, size: 2, x: -20, y: 24 },
  { delay: 340, size: 3, x: -54, y: 20 },
  { delay: 700, size: 2, x: -4, y: 6 },
] as const;

export const CHATGPT_CHIP_HOVER_OPEN_DELAY_MS = 150;

export const CHATGPT_CHIP_HOVER_CLOSE_DELAY_MS = 120;
