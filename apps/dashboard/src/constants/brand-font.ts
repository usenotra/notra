export const BRAND_FONT_API_URL = "https://api.fontsource.org/v1/fonts";
export const BRAND_FONT_CDN_ORIGIN = "https://cdn.jsdelivr.net";
export const BRAND_FONT_FETCH_TIMEOUT_MS = 15_000;
export const BRAND_FONT_METADATA_MAX_BYTES = 250_000;
export const BRAND_FONT_CSS_MAX_BYTES = 100_000;
export const BRAND_FONT_FILE_MAX_BYTES = 1_000_000;
export const BRAND_FONT_FAMILY_RE = /^[\p{L}\p{N} ._-]+$/u;
export const BRAND_FONT_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BRAND_FONT_FILE_PATH_RE =
  /^\/fontsource\/fonts\/[a-z0-9]+(?:-[a-z0-9]+)*@\d+\.\d+\.\d+\/[a-z0-9]+(?:-[a-z0-9]+)*\.woff2?$/;
export const BRAND_FONT_CSS_URL_RE = /url\(\s*["']?([^\s"')]+)["']?\s*\)/g;
