export const HERO_DITHER = {
  colorBack: "#00000000",
  colorFront: "#8B5CF633",
  fit: "cover",
  scale: 0.53,
  shape: "wave",
  size: 2.9,
  speed: 0.53,
  type: "4x4",
} as const;

export const HERO_DITHER_MOBILE_QUERY = "(width < 40rem)";
export const HERO_DITHER_MOBILE_MAX_PIXELS = 1_000_000;
export const HERO_DITHER_VIEWPORT_MARGIN = "200px";
export const HERO_DITHER_IDLE_FALLBACK_MS = 1500;
