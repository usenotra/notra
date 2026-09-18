import type { GeoExcludeRule, GeoPathRule } from "./types";

export const DEFAULT_ENDPOINT = "https://app.usenotra.com";

export const INGEST_PATH = "/api/geo/ingest";

export const INGEST_TIMEOUT_MS = 2000;

export const DEFAULT_EXCLUDE: GeoExcludeRule[] = ["/api"];

export const JOURNEY_ID_PARAM = "ntr";

export const JOURNEY_ID_PATTERN = /^[A-Za-z0-9_-]{8,32}$/;

export const JOURNEY_ID_BYTES = 12;

export const TAG_LOOP_GUARD_HEADER = "x-notra-geo-tag";

export const TAG_LOOP_GUARD_VALUE = "1";

export const DEFAULT_TAG_PATHS: GeoPathRule[] = [
  /\.md$/i,
  /(^|\/)llms\.txt$/i,
  /(^|\/)llms-full\.txt$/i,
];

export const TAGGABLE_CONTENT_TYPES = ["text/markdown", "text/plain"];

export const TAGGABLE_HTML_CONTENT_TYPES = ["text/html"];

export const TAG_STRIPPED_RESPONSE_HEADERS = [
  "content-encoding",
  "content-length",
  "transfer-encoding",
];

export const TAG_STRIPPED_RESPONSE_HEADER_PREFIXES = ["x-middleware-"];

export const ASSET_PATH_PREFIXES = [
  "/_next/",
  "/_nuxt/",
  "/_vercel/",
  "/_astro/",
  "/_app/",
  "/__nextjs",
  "/static/",
];

export const LLMS_TXT_FILE = /^llms(-full)?\.txt$/i;

export const ASSET_EXTENSIONS = [
  ".avif",
  ".css",
  ".eot",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".mp3",
  ".mp4",
  ".otf",
  ".pdf",
  ".png",
  ".svg",
  ".ttf",
  ".txt",
  ".wasm",
  ".webm",
  ".webmanifest",
  ".webp",
  ".woff",
  ".woff2",
  ".xml",
  ".zip",
];
