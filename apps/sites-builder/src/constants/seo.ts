export const EXCERPT_MAX_LENGTH = 160;

export const NON_PROSE_BLOCK =
  /^(?:import\s|export\s|#|```|~~~|<|\{|[-*+]\s|\d+\.\s|\||>|!\[)/;

export const DEFAULT_THEME_COLORS = { light: "#ffffff", dark: "#131316" };

export const TOUCH_ICON_EXTENSIONS = /\.(?:png|jpe?g)$/i;

export const X_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
]);

export const STRUCTURED_DATA_LIST_LIMIT = 50;

export const PROPERTY_META_TAG = /^(?:og|article|fb|profile|book):/i;
