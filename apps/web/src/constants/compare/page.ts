import { BrewLogo } from "@/components/landing/marquee-logos/brew-logo";
import { MARQUEE_LOGOS } from "@/constants/landing/marquee-quote";
import type {
  CompareLogo,
  CompareRowId,
  ComparePlan,
  CompareRowGroup,
} from "@/types/compare";
import type { MarqueeLogo } from "@/types/landing/marquee-quote";
import { PRICING_PLANS } from "@/utils/constants";

export const COMPARE_PATH = "/compare";

export const COMPARE_CUSTOMERS_CAPTION = "Used by teams that show up";

const COMPARE_CUSTOMER_LINKS: Record<string, string> = {
  databuddy: "https://www.databuddy.cc",
  "top-gg": "https://top.gg",
};

const COMPARE_HIDDEN_CUSTOMERS = new Set(["inth", "hexclave"]);

export const COMPARE_CUSTOMER_LOGOS: MarqueeLogo[] = [
  ...MARQUEE_LOGOS.filter(
    (logo) => !COMPARE_HIDDEN_CUSTOMERS.has(logo.name)
  ).map((logo) => ({
    ...logo,
    href: logo.href ?? COMPARE_CUSTOMER_LINKS[logo.name],
  })),
  { name: "brew", label: "Brew", Logo: BrewLogo, href: "https://brew.new" },
];

export const NOTRA_COMPARE_LOGO: CompareLogo = {
  src: "/notra-mark.svg",
  width: 40,
  height: 40,
};

export const COMPARE_VERIFIED_LABEL = "October 2026";

export const COMPARE_LAST_MODIFIED = new Date("2026-10-05");

export const COMPARE_AT_A_GLANCE_ROWS: CompareRowId[] = [
  "startingPrice",
  "entryEngines",
  "modelChoice",
  "prompts",
  "crawlerLogs",
  "contentWriting",
];

export const COMPARE_INDEX_TITLE = "Notra vs other AI visibility tools";

export const COMPARE_INDEX_DESCRIPTION =
  "Side-by-side comparisons of Notra with Profound, Peec AI, AthenaHQ, Scrunch, Otterly and other GEO platforms. What each one tracks, what it costs and where it wins.";

export const COMPARE_INDEX_SUBTITLE =
  "Side-by-side looks at the GEO tools teams weigh against Notra. We list what they do well too, so you can pick the right fit.";

export const COMPARE_DISCLAIMER = `Based on each vendor's public website, pricing page and docs as of ${COMPARE_VERIFIED_LABEL}. Products change fast, so check their site before you buy. Logos belong to their owners.`;

export const COMPARE_NOT_LISTED = "Not listed";

export const COMPARE_CORRECTION_HREF = "/contact";

export const COMPARE_CORRECTION_LABEL = "Send us a correction";

export const COMPARE_NOT_LISTED_NOTE =
  "Not listed on their public site or docs";

export const COMPARE_SIGNUP_SOURCE = "compare";

export const NOTRA_COMPARE_PLANS: ComparePlan[] = [
  {
    name: PRICING_PLANS.starter.name,
    price: `$${PRICING_PLANS.starter.pricing.monthly}/mo`,
    detail:
      "2,000 AI answers a month, unlimited prompts, 10 long-form posts, every engine",
  },
  {
    name: PRICING_PLANS.growth.name,
    price: `$${PRICING_PLANS.growth.pricing.monthly}/mo`,
    detail: "6,000 AI answers a month, 25 long-form posts, 3 projects",
  },
  {
    name: PRICING_PLANS.scale.name,
    price: `$${PRICING_PLANS.scale.pricing.monthly}/mo`,
    detail: "12,000 AI answers a month, 50 long-form posts, 10 projects",
  },
  {
    name: PRICING_PLANS.enterprise.name,
    price: "Custom",
    detail:
      "Unlimited answers, posts and projects, zero data retention included",
  },
];

export const NOTRA_PRICING_NOTE =
  "Annual billing gets two months free. Zero data retention is a 20% add-on below Enterprise.";

export const COMPARE_ROW_GROUPS: CompareRowGroup[] = [
  {
    category: "Answer engines",
    description: "Which AI assistants each tool asks, and how it asks them.",
    rows: [
      {
        id: "chatgpt",
        label: "ChatGPT",
        notra: "GPT-6, GPT-5.6, GPT-5.5, GPT-5.4",
      },
      {
        id: "claude",
        label: "Claude",
        notra: "Opus 5.5, Fable 5.1, Sonnet 5, Haiku 4.5",
      },
      {
        id: "gemini",
        label: "Gemini",
        notra: "Gemini 3.8 Flash, 3.5 Flash, 3.1 Pro",
      },
      { id: "perplexity", label: "Perplexity", notra: "Sonar" },
      {
        id: "aiOverviews",
        label: "Google AI Overviews and AI Mode",
        notra: true,
      },
      { id: "copilot", label: "Microsoft Copilot", notra: false },
      {
        id: "otherEngines",
        label: "Grok, DeepSeek or Meta AI",
        notra: "Grok 4.7, DeepSeek V4, Muse Spark 1.3",
      },
      {
        id: "codingAgents",
        label: "Coding agents (Claude Code, Codex, Cursor)",
        notra: "Early access",
      },
      {
        id: "modelChoice",
        label: "Pick exact model versions",
        notra: true,
      },
      {
        id: "entryEngines",
        label: "Engines on the cheapest plan",
        notra:
          "ChatGPT, Claude, Gemini, Perplexity, Google AI, Grok, DeepSeek, Meta AI",
      },
      {
        id: "collection",
        label: "How answers are collected",
        notra: "Model APIs with live web search",
      },
    ],
  },
  {
    category: "Visibility data",
    description: "What you learn from every answer.",
    rows: [
      {
        id: "shareOfVoice",
        label: "Mentions, position and share of voice",
        notra: true,
      },
      { id: "sentiment", label: "Sentiment", notra: true },
      { id: "citations", label: "Citations from real answers", notra: true },
      { id: "fanout", label: "Searches each engine ran", notra: true },
      {
        id: "rawAnswers",
        label: "Full answer behind every number",
        notra: true,
      },
      { id: "personas", label: "Buyer personas", notra: true },
      { id: "conversations", label: "Multi-turn conversations", notra: true },
      {
        id: "languages",
        label: "Languages and regions",
        notra: "Up to 4 languages",
      },
      { id: "frequency", label: "Scan frequency", notra: "Daily to monthly" },
      {
        id: "promptVolume",
        label: "Search demand behind prompts",
        notra: "Search Console data",
      },
      { id: "prompts", label: "Tracked prompts", notra: "Unlimited" },
    ],
  },
  {
    category: "AI traffic",
    description: "The bots and buyers that reach your site from AI.",
    rows: [
      { id: "crawlerLogs", label: "AI crawler logs", notra: true },
      { id: "referrals", label: "AI referral traffic", notra: true },
      {
        id: "conversions",
        label: "Conversions from AI referrals",
        notra: true,
      },
    ],
  },
  {
    category: "Content and action",
    description: "How each tool turns lost prompts into published content.",
    rows: [
      {
        id: "siteAudit",
        label: "AI readiness audit of your site",
        notra: true,
      },
      { id: "gaps", label: "Content gaps ranked by opportunity", notra: true },
      {
        id: "contentWriting",
        label: "Writes articles in your brand voice",
        notra: true,
      },
      { id: "socialPosts", label: "LinkedIn and X posts", notra: true },
      { id: "rescan", label: "Rescans a prompt when you publish", notra: true },
      {
        id: "githubPrs",
        label: "Ships content as GitHub pull requests",
        notra: true,
      },
      { id: "commerce", label: "Shopping and ads tracking", notra: false },
    ],
  },
  {
    category: "Platform",
    description: "Access, security and price.",
    rows: [
      { id: "api", label: "REST API", notra: true },
      { id: "mcp", label: "MCP server", notra: true },
      { id: "openSource", label: "Open source", notra: true },
      { id: "zdr", label: "Zero data retention", notra: "Add-on" },
      { id: "soc2", label: "SOC 2 report", notra: false },
      { id: "startingPrice", label: "Starting price", notra: "$100/mo" },
    ],
  },
];
