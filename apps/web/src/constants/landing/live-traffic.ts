import type { LiveTrafficProvider } from "@/types/landing/geo";

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
