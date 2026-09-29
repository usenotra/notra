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

/** Where each burst particle ends up, as an offset from the thumb center in px, plus size in px and delay in ms. */
export const CHATGPT_PRO_SPARKLES = [
  { delay: 0, size: 4, x: -30, y: -26 },
  { delay: 30, size: 3, x: 0, y: -34 },
  { delay: 10, size: 4, x: 30, y: -24 },
  { delay: 50, size: 3, x: -38, y: 2 },
  { delay: 20, size: 3, x: 38, y: 4 },
  { delay: 40, size: 4, x: -28, y: 26 },
  { delay: 0, size: 3, x: 2, y: 34 },
  { delay: 60, size: 4, x: 28, y: 26 },
  { delay: 80, size: 2, x: -18, y: -14 },
  { delay: 70, size: 2, x: 18, y: 16 },
] as const;

/** Stars inside the Pro track: position in % of the track, size in px, and animation timing in ms. */
export const CHATGPT_PRO_TWINKLES = [
  { delay: 0, duration: 3000, size: 2, x: 6, y: 32 },
  { delay: 900, duration: 3600, size: 3, x: 15, y: 66 },
  { delay: 400, duration: 2800, size: 2, x: 24, y: 28 },
  { delay: 1500, duration: 3400, size: 2, x: 33, y: 60 },
  { delay: 700, duration: 3200, size: 3, x: 43, y: 36 },
  { delay: 2100, duration: 3800, size: 2, x: 52, y: 70 },
  { delay: 300, duration: 3000, size: 2, x: 61, y: 30 },
  { delay: 1200, duration: 3500, size: 3, x: 70, y: 62 },
  { delay: 1800, duration: 2900, size: 2, x: 79, y: 34 },
  { delay: 600, duration: 3300, size: 2, x: 87, y: 64 },
] as const;

export const CHATGPT_CHIP_HOVER_OPEN_DELAY_MS = 150;

export const CHATGPT_CHIP_HOVER_CLOSE_DELAY_MS = 120;
