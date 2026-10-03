import type { CitationRow, LiveTrafficProvider } from "@/types/landing/geo";

export const LIVE_TRAFFIC_PROVIDERS: LiveTrafficProvider[] = [
  {
    provider: "ChatGPT-User",
    engine: "chatgpt",
    purposes: ["assistant-browse"],
  },
  { provider: "GPTBot", engine: "chatgpt", purposes: ["training-crawler"] },
  { provider: "OAI-SearchBot", engine: "chatgpt", purposes: ["search-index"] },
  { provider: "ChatGPT", engine: "chatgpt", purposes: ["assistant-referral"] },
  { provider: "Claude-User", engine: "claude", purposes: ["assistant-browse"] },
  { provider: "ClaudeBot", engine: "claude", purposes: ["training-crawler"] },
  {
    provider: "Claude-SearchBot",
    engine: "claude",
    purposes: ["search-index"],
  },
  {
    provider: "Claude Code",
    engine: "claude-code",
    purposes: ["assistant-browse"],
  },
  {
    provider: "PerplexityBot",
    engine: "perplexity",
    purposes: ["search-index"],
  },
  {
    provider: "Perplexity-User",
    engine: "perplexity",
    purposes: ["assistant-browse"],
  },
  {
    provider: "Perplexity",
    engine: "perplexity",
    purposes: ["assistant-referral"],
  },
  { provider: "Gemini", engine: "gemini", purposes: ["assistant-browse"] },
  {
    provider: "Google-Extended",
    engine: "gemini",
    purposes: ["training-crawler"],
  },
  { provider: "Grok", engine: "grok", purposes: ["assistant-referral"] },
  { provider: "KimiBot", engine: "kimi", purposes: ["search-index"] },
  { provider: "ChatGLM-Spider", engine: "glm", purposes: ["training-crawler"] },
];

export const LIVE_TRAFFIC_PATHS = [
  "/blog/geo-guide",
  "/docs/sdk",
  "/docs/sdk/quickstart",
  "/pricing",
  "/changelog",
  "/integrations",
  "/llms.txt",
  "/llms-full.txt",
  "/blog/ai-crawlers-explained",
  "/blog/share-of-voice",
  "/docs/mcp",
  "/customers/saas",
  "/compare/profound",
  "/blog/ai-search-visibility",
];

export const LIVE_TRAFFIC_MARKDOWN_PATHS = new Set([
  "/llms.txt",
  "/llms-full.txt",
  "/docs/sdk",
  "/docs/mcp",
]);

export const LIVE_TRAFFIC_MAX_ROWS = 20;

export const LIVE_TRAFFIC_INTERVAL_MS = 3200;

export const LIVE_TRAFFIC_HEADERS = {
  when: "When",
  provider: "Provider",
  path: "Path",
  purpose: "Purpose",
};

export const LIVE_TRAFFIC_SEED_ROWS: CitationRow[] = [
  {
    id: "c-1",
    agoSeconds: 2,
    provider: "ChatGPT-User",
    engine: "chatgpt",
    path: "/blog/geo-guide",
    purpose: "assistant-browse",
  },
  {
    id: "c-2",
    agoSeconds: 9,
    provider: "PerplexityBot",
    engine: "perplexity",
    path: "/docs/sdk",
    purpose: "search-index",
  },
  {
    id: "c-3",
    agoSeconds: 14,
    provider: "Claude-User",
    engine: "claude",
    path: "/pricing",
    purpose: "assistant-browse",
  },
  {
    id: "c-4",
    agoSeconds: 31,
    provider: "GPTBot",
    engine: "chatgpt",
    path: "/changelog",
    purpose: "training-crawler",
  },
  {
    id: "c-5",
    agoSeconds: 48,
    provider: "Perplexity",
    engine: "perplexity",
    path: "/integrations",
    purpose: "assistant-referral",
  },
  {
    id: "c-6",
    agoSeconds: 60,
    provider: "ClaudeBot",
    engine: "claude",
    path: "/llms.txt",
    purpose: "training-crawler",
    markdown: true,
  },
  {
    id: "c-7",
    agoSeconds: 120,
    provider: "Gemini",
    engine: "gemini",
    path: "/docs/sdk/quickstart",
    purpose: "assistant-browse",
  },
  {
    id: "c-8",
    agoSeconds: 120,
    provider: "OAI-SearchBot",
    engine: "chatgpt",
    path: "/customers/saas",
    purpose: "search-index",
  },
  {
    id: "c-9",
    agoSeconds: 180,
    provider: "KimiBot",
    engine: "kimi",
    path: "/blog/ai-search-visibility",
    purpose: "search-index",
  },
  {
    id: "c-10",
    agoSeconds: 240,
    provider: "ChatGPT",
    engine: "chatgpt",
    path: "/pricing",
    purpose: "assistant-referral",
  },
  {
    id: "c-11",
    agoSeconds: 300,
    provider: "ChatGLM-Spider",
    engine: "glm",
    path: "/blog/geo-guide",
    purpose: "training-crawler",
  },
  {
    id: "c-12",
    agoSeconds: 360,
    provider: "Claude Code",
    engine: "claude-code",
    path: "/llms-full.txt",
    purpose: "assistant-browse",
    markdown: true,
  },
];
