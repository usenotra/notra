import { DEMO_URL } from "@/utils/urls";

export const LIVE_DEMO_EMBED_URL = `${DEMO_URL}/?banner=off`;

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

export const LIVE_DEMO_PREVIEW_SRC = "/landing/demo-preview.jpg";

export const LIVE_DEMO_PREVIEW_ALT =
  "Notra GEO overview with visibility by engine and what changed";

export const LIVE_DEMO_IFRAME_TITLE = "Notra live demo";

export const LIVE_DEMO_OPEN_LABEL = "Explore the demo";

export const LIVE_DEMO_CLOSE_LABEL = "Close demo";

export const LIVE_DEMO_LOADING_LABEL = "Opening your demo workspace…";
