import { SITE_ASSETS_DIR } from "@notra/sites-core/constants/sites";

export const ASSET_SEGMENT = `/${SITE_ASSETS_DIR}/`;

export const EDGE_CACHE_ORIGIN = "https://sites-cache.notra.internal";

export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export const AI_USER_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "MistralAI-User",
  "DuckAssistBot",
];
