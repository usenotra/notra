import type {
  FeaturesPageCard,
  FeaturesPageSectionCopy,
  FeaturesPageStudioCard,
} from "@/types/features-page";

export const FEATURES_PAGE_TITLE = "Features";

export const FEATURES_PAGE_DESCRIPTION =
  "Track how ChatGPT, Claude, Gemini and Perplexity mention your brand, attribute AI agent traffic to your site and write the content for the prompts you lose.";

export const FEATURES_PAGE_HERO_TITLE_PREFIX = "See where you stand in";

export const FEATURES_PAGE_HERO_TITLE_HIGHLIGHT = "AI answers";

export const FEATURES_PAGE_HERO_SUBTITLE =
  "Track prompts, engines, competitors and the traffic behind them.";

export const FEATURES_PAGE_TRACKING: FeaturesPageSectionCopy = {
  heading: "What Notra tracks",
  subcopy:
    "You decide the questions, the engines and the languages. Notra runs them on a schedule and keeps every answer.",
};

export const FEATURES_PAGE_TRACKING_CARDS: FeaturesPageCard[] = [
  {
    title: "Prompts",
    description:
      "The buyer questions you want to show up for. Write them yourself, let Notra pull them from your website or import a CSV. Google Search Console turns your real queries into new prompt suggestions every week.",
  },
  {
    title: "Engines and models",
    description:
      "ChatGPT, Claude, Gemini and Perplexity with web search, plus Google AI Overview and coding agents that research live. The list refreshes as new releases ship.",
  },
  {
    title: "Languages",
    description:
      "Run the same prompts in up to five languages. Each one gets its own mention rate, so you can see where you win in English and lose in German.",
  },
  {
    title: "Conversations",
    description:
      "Notra replays multi-turn chats of up to five turns on every engine with web search. Engines often make their recommendation in a follow-up answer.",
  },
  {
    title: "Scans",
    description:
      "Daily by default, or every 48 hours, 3 days, week, 2 weeks or 30 days. Every answer is stored with the searches the engine ran and the pages it cited.",
  },
  {
    title: "Zero data retention",
    description:
      "ZDR is an add-on. With it enforced, prompts only go to models whose provider offers zero data retention. Everything else stays off unless you approve it.",
  },
];

export const FEATURES_PAGE_IMPROVE: FeaturesPageSectionCopy = {
  heading: "Turn a lost answer into a page",
  subcopy:
    "Once you know which answers leave you out, publish a page the engines can cite.",
};

export const FEATURES_PAGE_IMPROVE_CARDS: FeaturesPageCard[] = [
  {
    title: "Content gaps",
    description:
      "Prompts where most engines answered without you, ranked by how winnable they look. Each row shows the missing engines and the brands mentioned instead.",
  },
  {
    title: "Write",
    description:
      "Pick a gap and choose guide, listicle or comparison. Write plans a brief from your brand identity, your sitemap and the competitors you track. Approve it and the draft opens in Content with real internal links and a FAQ.",
  },
  {
    title: "Agent readiness",
    description:
      "A score out of 100 for how well AI agents can discover, understand and use your website, with a must-do and should-do checklist and copyable fix prompts for your coding agent.",
  },
  {
    title: "Agent feedback",
    description:
      "A public URL where AI agents and MCP tools can leave feedback about your product, no token needed. Notra classifies it and files it in an inbox.",
  },
];

export const FEATURES_PAGE_DEVELOPERS: FeaturesPageSectionCopy = {
  heading: "Built for agents too",
  subcopy:
    "Everything in the dashboard is reachable from code, and the site you are reading is tracked with the same SDK.",
};

export const FEATURES_PAGE_DEVELOPER_CARDS: FeaturesPageCard[] = [
  {
    title: "REST API",
    description:
      "OpenAPI 3.1 with scoped API keys or OAuth 2.1. Projects, prompts, scans, visibility, gaps, briefs, agent readiness and traffic.",
  },
  {
    title: "MCP server",
    description:
      "Connect Notra to Claude Code, Cursor, Codex or any MCP client and work with your content and brand voice from the editor.",
  },
  {
    title: "@usenotra/geo",
    description:
      "One package for Next.js, Nuxt, TanStack Start, Astro and SvelteKit. Server-side capture, 66 agent signatures, journey tagging and an MCP feedback tool.",
  },
];

export const FEATURES_PAGE_STUDIO: FeaturesPageSectionCopy = {
  heading: "Studio: content from what you ship",
  subcopy:
    "The product Notra started with is still here. Connect your tools and get drafts in your voice.",
};

export const FEATURES_PAGE_STUDIO_CARDS: FeaturesPageStudioCard[] = [
  {
    title: "One timeline of everything you shipped",
    description:
      "PRs, issues and decisions from GitHub, Linear and Slack land in one place, so nothing worth writing about slips through.",
    visual: "activity",
  },
  {
    title: "Drafts that don't sound like AI",
    description:
      "Notra learns your brand voice from your real posts and tweets. Every draft reads like your best writer wrote it.",
    visual: "brandVoice",
  },
  {
    title: "Set up in under a minute",
    description:
      "One click connects GitHub, Linear and Slack, with no pipelines or prompts to set up.",
    visual: "integrations",
  },
  {
    title: "Train it on your best writing",
    description:
      "Add your tweets, launch posts or blog snippets and Notra matches their tone, cadence and vocabulary.",
    visual: "references",
  },
];
