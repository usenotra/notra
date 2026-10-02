import type {
  CrawlerCategory,
  CrawlerCategoryCopy,
  CrawlerIpSource,
  IpCheckEasterEgg,
  IpCheckSample,
  IpCheckStatus,
} from "@/types/ip-checker";
import { SITE_URL } from "@/utils/urls";

const IP_CHECKER_PATH = "/ip-checker";

export const IP_CHECKER_URL = `${SITE_URL}${IP_CHECKER_PATH}`;

export const IP_CHECKER_MARKDOWN_URL = `${IP_CHECKER_URL}.md`;

export const IP_CHECKER_API_URL = `${SITE_URL}/api${IP_CHECKER_PATH}`;

export const IP_CHECKER_TITLE = "AI Crawler IP Checker";

export const IP_CHECKER_DESCRIPTION =
  "Paste an IP address and see whether it belongs to GPTBot, ClaudeBot, PerplexityBot, Googlebot, Bingbot or another AI crawler, checked against the ranges each vendor publishes. Free, no sign-up.";

export const IP_CHECKER_HERO_SUBTITLE =
  "Paste an IP from your server logs. We check it against the ranges OpenAI, Anthropic, Google, Perplexity, Microsoft and others publish for their crawlers. Free, no sign-up.";

export const IP_CHECKER_STATUS_MESSAGES: Partial<
  Record<IpCheckStatus, string>
> = {
  invalid: "Enter a valid IPv4 or IPv6 address.",
  "rate-limited": "Too many checks in a row. Try again in a bit.",
  error: "Something went wrong. Try again.",
};

const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

export const IP_CHECKER_MOTION = {
  enter: { duration: 0.4, ease: MOTION_EASE, delay: 0.08 },
  exit: { duration: 0.28, ease: MOTION_EASE },
} as const;

export const IP_CHECKER_PLACEHOLDER = "1.1.1.1";

export const IP_CHECKER_QUERY_KEY = "ip";

export const IP_CHECKER_EASTER_EGGS: readonly IpCheckEasterEgg[] = [
  {
    ip: "1.1.1.1",
    iconEngine: "cloudflare",
    title: "That is Cloudflare's DNS resolver",
    body: "1.1.1.1 answers DNS lookups for half the internet. It resolves names, it never crawls pages. Try an address from your server logs.",
  },
  {
    ip: "1.0.0.1",
    iconEngine: "cloudflare",
    title: "That is Cloudflare's DNS resolver",
    body: "1.0.0.1 is the twin of 1.1.1.1. It resolves names, it never crawls pages. Try an address from your server logs.",
  },
];

export const IP_CHECKER_LIST_REVALIDATE_SECONDS = 60 * 60;

export const IP_CHECKER_FETCH_TIMEOUT_MS = 8000;

export const IP_CHECKER_FAILURE_CACHE_SECONDS = 60;

export const IP_CHECKER_FETCH_USER_AGENT =
  "NotraIpCheck/1.0 (+https://www.usenotra.com/ip-checker)";

export const IP_CHECKER_RATE_LIMIT = {
  requests: 240,
  window: "1h",
} as const;

export const CRAWLER_CATEGORY_COPY: Record<
  CrawlerCategory,
  CrawlerCategoryCopy
> = {
  "training-crawler": {
    label: "Training crawler",
    usage: "Collects pages to train or improve AI models.",
    className:
      "bg-[#FDF1DC] text-[#8A5A00] dark:bg-[#F5A62333] dark:text-[#F5C76A]",
  },
  "search-index": {
    label: "Search index",
    usage: "Indexes pages so the assistant can cite them in answers.",
    className:
      "bg-[#EDE6FB] text-[#5B3BB5] dark:bg-[#8B5CF633] dark:text-[#C4B5FD]",
  },
  "assistant-browse": {
    label: "Live fetcher",
    usage: "Fetches a page on demand when a user asks the assistant about it.",
    className:
      "bg-[#DFF5E8] text-[#1C6B3F] dark:bg-[#22C55E2E] dark:text-[#86EFAC]",
  },
};

export const CRAWLER_IP_SOURCES: readonly CrawlerIpSource[] = [
  {
    id: "openai-gptbot",
    vendor: "OpenAI",
    iconEngine: "GPTBot",
    url: "https://openai.com/gptbot.json",
    docs: "https://developers.openai.com/api/docs/bots",
    agents: [{ name: "GPTBot", category: "training-crawler" }],
  },
  {
    id: "openai-searchbot",
    vendor: "OpenAI",
    iconEngine: "OAI-SearchBot",
    url: "https://openai.com/searchbot.json",
    docs: "https://developers.openai.com/api/docs/bots",
    agents: [{ name: "OAI-SearchBot", category: "search-index" }],
  },
  {
    id: "openai-chatgpt-user",
    vendor: "OpenAI",
    iconEngine: "ChatGPT-User",
    url: "https://openai.com/chatgpt-user.json",
    docs: "https://developers.openai.com/api/docs/bots",
    agents: [{ name: "ChatGPT-User", category: "assistant-browse" }],
  },
  {
    id: "openai-adsbot",
    vendor: "OpenAI",
    iconEngine: "OAI-AdsBot",
    url: "https://openai.com/adsbot.json",
    docs: "https://developers.openai.com/api/docs/bots",
    agents: [{ name: "OAI-AdsBot", category: "search-index" }],
  },
  {
    id: "anthropic",
    vendor: "Anthropic",
    iconEngine: "ClaudeBot",
    url: "https://claude.com/crawling/bots.json",
    docs: "https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler",
    agents: [
      { name: "ClaudeBot", category: "training-crawler" },
      { name: "Claude-SearchBot", category: "search-index" },
      { name: "Claude-User", category: "assistant-browse" },
    ],
  },
  {
    id: "perplexity-bot",
    vendor: "Perplexity",
    iconEngine: "PerplexityBot",
    url: "https://www.perplexity.ai/perplexitybot.json",
    docs: "https://docs.perplexity.ai/guides/bots",
    agents: [{ name: "PerplexityBot", category: "search-index" }],
  },
  {
    id: "perplexity-user",
    vendor: "Perplexity",
    iconEngine: "Perplexity-User",
    url: "https://www.perplexity.ai/perplexity-user.json",
    docs: "https://docs.perplexity.ai/guides/bots",
    agents: [{ name: "Perplexity-User", category: "assistant-browse" }],
  },
  {
    id: "google-common-crawlers",
    vendor: "Google",
    iconEngine: "Googlebot",
    url: "https://developers.google.com/static/crawling/ipranges/common-crawlers.json",
    docs: "https://developers.google.com/crawling/docs/crawlers-user-agents/overview-google-crawlers",
    agents: [
      { name: "Googlebot", category: "search-index" },
      { name: "Google-CloudVertexBot", category: "search-index" },
      { name: "GoogleOther", category: "training-crawler" },
      { name: "GoogleOther-Image", category: "training-crawler" },
      { name: "GoogleOther-Video", category: "training-crawler" },
    ],
  },
  {
    id: "google-user-triggered-agents",
    vendor: "Google",
    iconEngine: "Google-Agent",
    url: "https://developers.google.com/static/crawling/ipranges/user-triggered-agents.json",
    docs: "https://developers.google.com/crawling/docs/crawlers-user-agents/overview-google-crawlers",
    agents: [{ name: "Google-Agent", category: "assistant-browse" }],
  },
  {
    id: "google-user-triggered-fetchers",
    vendor: "Google",
    iconEngine: "Google-GeminiNotebook",
    url: "https://developers.google.com/static/crawling/ipranges/user-triggered-fetchers-google.json",
    docs: "https://developers.google.com/crawling/docs/crawlers-user-agents/overview-google-crawlers",
    agents: [{ name: "Google-GeminiNotebook", category: "assistant-browse" }],
  },
  {
    id: "microsoft-bingbot",
    vendor: "Microsoft",
    iconEngine: "bingbot",
    url: "https://www.bing.com/toolbox/bingbot.json",
    docs: "https://www.bing.com/webmasters/help/verifying-that-bingbot-is-bingbot-3905dc26",
    agents: [{ name: "Bingbot", category: "search-index" }],
  },
  {
    id: "apple-applebot",
    vendor: "Apple",
    iconEngine: "Applebot",
    url: "https://search.developer.apple.com/applebot.json",
    docs: "https://support.apple.com/en-us/119829",
    agents: [{ name: "Applebot", category: "search-index" }],
  },
  {
    id: "duckduckgo-duckassistbot",
    vendor: "DuckDuckGo",
    iconEngine: "DuckAssistBot",
    url: "https://duckduckgo.com/duckassistbot.json",
    docs: "https://duckduckgo.com/duckduckgo-help-pages/results/duckassistbot/",
    agents: [{ name: "DuckAssistBot", category: "assistant-browse" }],
  },
  {
    id: "mistral-user",
    vendor: "Mistral",
    iconEngine: "MistralAI-User",
    url: "https://mistral.ai/mistralai-user-ips.json",
    docs: "https://docs.mistral.ai/robots/",
    agents: [{ name: "MistralAI-User", category: "assistant-browse" }],
  },
  {
    id: "moonshot-kimi",
    vendor: "Moonshot AI",
    iconEngine: "KimiBot",
    url: "https://www.kimi.ai/policies/kimibot.json",
    docs: "https://www.kimi.ai/policies/kimibot",
    agents: [
      { name: "KimiBot", category: "training-crawler" },
      { name: "Kimi-SearchBot", category: "search-index" },
      { name: "Kimi-User", category: "assistant-browse" },
    ],
  },
  {
    id: "liner-linerbot",
    vendor: "Liner",
    iconEngine: "LinerBot",
    url: "https://docs.getliner.com/linerbot.json",
    docs: "https://docs.getliner.com/linerbot",
    agents: [{ name: "LinerBot", category: "search-index" }],
  },
  {
    id: "commoncrawl-ccbot",
    vendor: "Common Crawl",
    iconEngine: "CCBot",
    url: "https://index.commoncrawl.org/ccbot.json",
    docs: "https://commoncrawl.org/ccbot",
    agents: [{ name: "CCBot", category: "training-crawler" }],
  },
];

export const IP_CHECKER_SAMPLES: readonly IpCheckSample[] = [
  { ip: "132.196.86.4", label: "GPTBot" },
  { ip: "216.73.216.20", label: "ClaudeBot" },
  { ip: "107.20.236.150", label: "PerplexityBot" },
  { ip: "66.249.66.1", label: "Googlebot" },
  { ip: "157.55.39.10", label: "Bingbot" },
];
