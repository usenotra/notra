import { SITE_ASSETS_DIR } from "@notra/sites-core/constants/sites";

export const ASSET_SEGMENT = `/${SITE_ASSETS_DIR}/`;

export const EDGE_CACHE_ORIGIN = "https://sites-cache.notra.internal";

export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
export const REVALIDATE_CACHE_CONTROL = "public, max-age=0, must-revalidate";
export const PREVIEW_CACHE_CONTROL = "private, no-store";
export const REDIRECT_CACHE_CONTROL = "public, max-age=300";

export const ROBOTS_TXT_MAX_AGE_SECONDS = 300;
export const SECURITY_TXT_MAX_AGE_SECONDS = 86_400;

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
