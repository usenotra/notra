export const GOOGLE_FONTS_CSS_URL = "https://fonts.googleapis.com/css2";
export const GOOGLE_FONTS_LICENSE_URL =
  "https://raw.githubusercontent.com/google/fonts/main";
export const FONT_LICENSE_LOCATIONS = [
  ["ofl", "OFL.txt"],
  ["apache", "LICENSE.txt"],
  ["ufl", "UFL.txt"],
] as const;
export const FONT_FETCH_TIMEOUT_MS = 30_000;
export const FONT_CSS_MAX_BYTES = 100_000;
export const FONT_FILE_MAX_BYTES = 5_000_000;
export const FONT_URL_RE = /url\(\s*["']?([^\s"')]+)["']?\s*\)/g;
export const FONT_PATH_RE = /^\/s\/[\w/-]+\.(woff2?|ttf|otf)$/;
export const FONT_USER_AGENT =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
