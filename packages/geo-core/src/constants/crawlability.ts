import type { CrawlabilityResult } from "@notra/db/types/crawlability";

export const CRAWLABILITY_PAGE_LIMIT = 20;
export const CRAWLABILITY_DISCOVERY_LIMIT = 1000;
export const CRAWLABILITY_SITEMAP_LIMIT = 3;
export const CRAWLABILITY_TIMEOUT_MS = 8000;
export const CRAWLABILITY_SCAN_TIMEOUT_MS = 90_000;
export const CRAWLABILITY_MAX_BYTES = 2 * 1024 * 1024;
export const CRAWLABILITY_CRAWLERS = [
  { agent: "Googlebot", purpose: "Google Search" },
  { agent: "bingbot", purpose: "Bing Search" },
  { agent: "OAI-SearchBot", purpose: "ChatGPT search" },
  { agent: "PerplexityBot", purpose: "Perplexity search" },
  { agent: "Claude-SearchBot", purpose: "Claude search" },
  { agent: "ClaudeBot", purpose: "Claude training" },
  { agent: "GPTBot", purpose: "OpenAI training" },
] as const;

export const CRAWLABILITY_RESULT_ORDER: Record<CrawlabilityResult, number> = {
  blocked: 0,
  unknown: 1,
  review: 2,
  passed: 3,
};
