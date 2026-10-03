import { DEMO_URL } from "@/utils/urls";

export const LIVE_DEMO_EMBED_URL = `${DEMO_URL}/?banner=off`;

export const LIVE_DEMO_ORIGIN = DEMO_URL;

export const LIVE_DEMO_THEME_PARAM = "theme";

export const LIVE_DEMO_THEME_MESSAGE = "notra:demo-theme";

export const LIVE_DEMO_READY_MESSAGE = "notra:demo-ready";

export const LIVE_DEMO_FALLBACK_URL = DEMO_URL;

export const LIVE_DEMO_IFRAME_SANDBOX = [
  "allow-scripts",
  "allow-same-origin",
  "allow-forms",
  "allow-downloads",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-top-navigation-by-user-activation",
].join(" ");

export const LIVE_DEMO_PREVIEW_SRC = "/landing/demo-preview.webp";

export const LIVE_DEMO_PREVIEW_DARK_SRC = "/landing/demo-preview-dark.webp";

export const LIVE_DEMO_PREVIEW_ALT =
  "Notra GEO overview with visibility by engine and what changed";

export const LIVE_DEMO_IFRAME_TITLE = "Notra live demo";

export const LIVE_DEMO_OPEN_LABEL = "Explore the demo";

export const LIVE_DEMO_CLOSE_LABEL = "Close demo";

/** After this long without `load`, offer the standalone demo instead. */
export const LIVE_DEMO_LOAD_TIMEOUT_MS = 15_000;

export const LIVE_DEMO_LOADING_LABEL = "Opening your demo workspace…";

export const LIVE_DEMO_STALLED_LABEL = "The demo is taking longer than usual.";

export const LIVE_DEMO_STALLED_ACTION = "Open it in a new tab";
