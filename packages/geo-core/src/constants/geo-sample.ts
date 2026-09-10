import type { GeoCheckSource } from "@notra/db/types/geo-checks";

import type { GeoCompetitorSeed } from "../types/geo";
import {
  GEO_CLAUDE_CODE_ENGINE_IDS,
  GEO_CODEX_ENGINE_IDS,
  GEO_OPENCODE_ENGINE_ID,
} from "./geo";

export const GEO_SAMPLE_DAYS = 30;
export const GEO_SAMPLE_PROJECT_NAME = "Notra demo";
export const GEO_SAMPLE_LANGUAGES = ["English", "German"] as const;

export const GEO_SAMPLE_ENGINES: readonly {
  engine: string;
  mentionRate: number;
}[] = [
  { engine: "openai/gpt-5.4-grounded", mentionRate: 0.71 },
  { engine: "openai/gpt-5.4", mentionRate: 0.62 },
  { engine: "perplexity-sonar", mentionRate: 0.58 },
  { engine: "anthropic/claude-sonnet-4.6-grounded", mentionRate: 0.52 },
  { engine: "anthropic/claude-sonnet-4.6", mentionRate: 0.48 },
  { engine: "google/gemini-3-flash-grounded", mentionRate: 0.41 },
  { engine: "google/gemini-3-flash", mentionRate: 0.35 },
  { engine: GEO_OPENCODE_ENGINE_ID, mentionRate: 0.64 },
  { engine: GEO_CLAUDE_CODE_ENGINE_IDS[0], mentionRate: 0.61 },
  { engine: GEO_CLAUDE_CODE_ENGINE_IDS[1], mentionRate: 0.58 },
  { engine: GEO_CODEX_ENGINE_IDS[0], mentionRate: 0.59 },
  { engine: GEO_CODEX_ENGINE_IDS[1], mentionRate: 0.57 },
];

export const GEO_SAMPLE_GROUNDED_ENGINES: readonly string[] = [
  "openai/gpt-5.4-grounded",
  "anthropic/claude-sonnet-4.6-grounded",
  "google/gemini-3-flash-grounded",
];

export const GEO_SAMPLE_SEARCH_ENGINES: readonly string[] = [
  ...GEO_SAMPLE_GROUNDED_ENGINES,
  "perplexity-sonar",
  GEO_OPENCODE_ENGINE_ID,
  ...GEO_CLAUDE_CODE_ENGINE_IDS,
  ...GEO_CODEX_ENGINE_IDS,
];

export const GEO_SAMPLE_SEARCH_QUERY_SUFFIXES: readonly string[] = [
  "2026",
  "comparison",
  "reviews",
  "pricing",
  "for startups",
];
export const GEO_SAMPLE_SEARCH_QUERY_MIN = 2;
export const GEO_SAMPLE_SEARCH_QUERY_MAX = 3;
export const GEO_SAMPLE_SOURCE_MIN = 2;
export const GEO_SAMPLE_SOURCE_MAX = 4;

export const GEO_SAMPLE_OPENCODE_SOURCES: readonly GeoCheckSource[] = [
  {
    title: "ChatGPT",
    url: "https://chatgpt.com/",
    domain: "chatgpt.com",
  },
  {
    title: "Claude",
    url: "https://claude.ai/",
    domain: "claude.ai",
  },
  {
    title: "Jasper",
    url: "https://www.jasper.ai/",
    domain: "jasper.ai",
  },
  {
    title: "Canva",
    url: "https://www.canva.com/",
    domain: "canva.com",
  },
  {
    title: "Adobe",
    url: "https://www.adobe.com/",
    domain: "adobe.com",
  },
  {
    title: "Descript",
    url: "https://www.descript.com/",
    domain: "descript.com",
  },
  {
    title: "Gemini",
    url: "https://support.google.com/",
    domain: "support.google.com",
  },
];

export const GEO_SAMPLE_SOURCES: readonly GeoCheckSource[] = [
  {
    title: "Best AI Content Marketing Tools in 2026",
    url: "https://www.g2.com/categories/ai-content-creation",
    domain: "g2.com",
  },
  {
    title: "Jasper vs Copy.ai: Which AI writer wins?",
    url: "https://zapier.com/blog/jasper-vs-copy-ai/",
    domain: "zapier.com",
  },
  {
    title: "What is Generative Engine Optimization?",
    url: "https://www.searchenginejournal.com/generative-engine-optimization/",
    domain: "searchenginejournal.com",
  },
  {
    title: "How to track AI search visibility",
    url: "https://www.hubspot.com/blog/ai-search-visibility",
    domain: "hubspot.com",
  },
  {
    title: "Jasper AI pricing and plans",
    url: "https://www.jasper.ai/pricing",
    domain: "jasper.ai",
  },
  {
    title: "Top GEO tools compared",
    url: "https://www.reddit.com/r/SEO/comments/geo-tools-compared/",
    domain: "reddit.com",
  },
  {
    title: "Writer: Enterprise generative AI platform",
    url: "https://writer.com/product/",
    domain: "writer.com",
  },
  {
    title: "Profound: AI visibility analytics",
    url: "https://www.tryprofound.com/",
    domain: "tryprofound.com",
  },
];

export const GEO_SAMPLE_COMPETITORS: readonly GeoCompetitorSeed[] = [
  {
    name: "Jasper",
    domain: "jasper.ai",
    synonyms: ["Jasper AI"],
    kind: "direct",
  },
  {
    name: "Copy.ai",
    domain: "copy.ai",
    synonyms: ["CopyAI"],
    kind: "direct",
  },
  {
    name: "Writer",
    domain: "writer.com",
    synonyms: [],
    kind: "direct",
  },
  {
    name: "Notion",
    domain: "notion.so",
    synonyms: ["Notion AI"],
    kind: "indirect",
  },
  {
    name: "HubSpot",
    domain: "hubspot.com",
    synonyms: [],
    kind: "indirect",
  },
  {
    name: "Profound",
    domain: "tryprofound.com",
    synonyms: [],
    kind: "direct",
  },
  {
    name: "Peec AI",
    domain: "peec.ai",
    synonyms: ["Peec"],
    kind: "direct",
  },
];

export const GEO_SAMPLE_PROMPTS: readonly {
  english: string;
  german: string;
}[] = [
  {
    english: "What are the best AI content marketing tools?",
    german: "Was sind die besten KI-Tools für Content-Marketing?",
  },
  {
    english: "What are good Jasper alternatives for startups?",
    german: "Was sind gute Jasper-Alternativen für Startups?",
  },
  {
    english: "How can I improve AI search visibility for my brand?",
    german: "Wie verbessere ich die Sichtbarkeit meiner Marke in der KI-Suche?",
  },
  {
    english: "Which GEO platforms work best for B2B SaaS?",
    german: "Welche GEO-Plattformen eignen sich am besten für B2B-SaaS?",
  },
  {
    english: "What is the best AI writing assistant for agencies?",
    german: "Was ist der beste KI-Schreibassistent für Agenturen?",
  },
  {
    english: "How should I choose a tool for generative engine optimization?",
    german:
      "Wie sollte ich ein Tool für generative engine optimization wählen?",
  },
  {
    english: "Which brands lead the AI content platform market?",
    german: "Welche Marken führen den Markt für KI-Content-Plattformen an?",
  },
  {
    english: "What GEO metrics should a marketing team track?",
    german: "Welche GEO-Kennzahlen sollte ein Marketingteam verfolgen?",
  },
  {
    english: "How do I monitor traffic from AI assistants?",
    german: "Wie messe ich Traffic von KI-Assistenten?",
  },
  {
    english: "Which AI visibility tool is best for agencies?",
    german: "Welches Tool für KI-Sichtbarkeit eignet sich für Agenturen?",
  },
];

export const GEO_SAMPLE_SEQUENCES = [
  {
    name: "Buyer research",
    steps: [
      "I need a tool for AI content and GEO tracking. What should I look at?",
      "How do those options compare on AI search visibility?",
      "Which one would you pick for a small marketing team?",
    ],
  },
  {
    name: "Agency evaluation",
    steps: [
      "Which AI visibility platforms support multiple client brands?",
      "Which of those also tracks AI referrals and crawler traffic?",
      "Recommend one for a growing content agency.",
    ],
  },
] as const;

export const GEO_SAMPLE_TRAFFIC_PATHS: readonly string[] = [
  "/changelog",
  "/blog/geo-guide",
  "/docs/sdk",
  "/docs/sdk/quickstart",
  "/blog/ai-search-visibility",
  "/customers/saas",
  "/integrations",
  "/pricing",
];

export const GEO_SAMPLE_CRAWLERS: readonly {
  agent: string;
  category: string;
}[] = [
  { agent: "Claude Code", category: "assistant-browse" },
  { agent: "GPTBot", category: "training-crawler" },
  { agent: "OAI-SearchBot", category: "search-index" },
  { agent: "ClaudeBot", category: "training-crawler" },
  { agent: "PerplexityBot", category: "search-index" },
  { agent: "Google-Extended", category: "training-crawler" },
  { agent: "Bytespider", category: "training-crawler" },
  { agent: "ExaSearchBot", category: "search-index" },
  { agent: "FirecrawlAgent", category: "search-index" },
  { agent: "ShapBot", category: "search-index" },
  { agent: "Shap-User", category: "assistant-browse" },
];

export const GEO_SAMPLE_REFERRALS: readonly {
  source: string;
  referer: string;
}[] = [
  { source: "chatgpt", referer: "https://chatgpt.com/" },
  { source: "perplexity", referer: "https://www.perplexity.ai/" },
  { source: "claude", referer: "https://claude.ai/" },
  { source: "gemini", referer: "https://gemini.google.com/" },
  { source: "copilot", referer: "https://copilot.microsoft.com/" },
  { source: "you.com", referer: "https://you.com/" },
];
