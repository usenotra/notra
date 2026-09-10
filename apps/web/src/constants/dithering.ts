export const DITHER_MOBILE_QUERY = "(width < 640px)";
export const DITHER_MOBILE_MAX_PIXELS = 1_000_000;

export const BLOG_CARD_DITHER_MAX_PIXELS = 200_000;

export const BLOG_CARD_DITHER_RANGES = {
  frame: [0, 12_000],
  scale: [0.6, 0.9],
  speed: [0.3, 0.65],
} as const;
