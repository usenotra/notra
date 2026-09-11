import type { FeaturesCardCopy } from "@/types/landing/features";
import type {
  EngineRateRow,
  GapRow,
  KpiTile,
  ShareRow,
  TrafficSourceRow,
} from "@/types/landing/geo";

export const FEATURES_TABLE_OPTIONAL_COL = "hidden @2xl:table-cell";

export const FEATURES_HEADING = "Every number the dashboard shows you.";

export const FEATURES_SUBCOPY_LINE_ONE =
  "These are the tables in the product, filled with sample data.";

export const FEATURES_SUBCOPY_LINE_TWO =
  "No vanity score. Mentions, positions, share of voice, and the traffic behind them.";

export const FEATURES_ENGINES_COPY: FeaturesCardCopy = {
  title: "Mention rate by engine",
  description:
    "Each prompt goes to each model you turn on, with web search and without. You get who mentioned you, where in the list, and whether that moved since the last scan.",
};

export const FEATURES_SHARE_COPY: FeaturesCardCopy = {
  title: "Share of voice",
  description:
    "Who gets recommended when you don't. Add direct and indirect competitors, plus the misspellings people use for them, and see the split per prompt, language and engine.",
};

export const FEATURES_TRAFFIC_COPY: FeaturesCardCopy = {
  title: "AI traffic, attributed",
  description:
    "Hits from 66 known AI agents, sorted by what they were doing: training a model, building an index, reading a page to answer someone or a person clicking through. We don't count a fetch as a citation.",
};

export const FEATURES_GAPS_COPY: FeaturesCardCopy = {
  title: "Content Gaps to Write",
  description:
    "The questions where engines answer and you are not in the answer, ranked by how winnable they look. Write plans a guide, listicle or comparison and the draft lands in Content.",
};

export const FEATURES_ENGINES_FRAME = {
  heading: "Mention rate by engine",
  subhead: "Last 30 days, 14 prompts, English and German",
};

export const FEATURES_ENGINE_HEADERS = {
  engine: "Engine",
  mentionRate: "Mention rate",
  avgPosition: "Avg position",
  lastChecked: "Last checked",
};

export const FEATURES_ENGINE_ROWS: EngineRateRow[] = [
  {
    id: "chatgpt",
    mentionRate: 71,
    mentions: 20,
    checks: 28,
    avgPosition: 2.1,
    lastChecked: "2h ago",
  },
  {
    id: "perplexity",
    mentionRate: 58,
    mentions: 16,
    checks: 28,
    avgPosition: 2.6,
    lastChecked: "2h ago",
  },
  {
    id: "claude",
    mentionRate: 52,
    mentions: 15,
    checks: 28,
    avgPosition: 2.4,
    lastChecked: "2h ago",
  },
  {
    id: "gemini",
    mentionRate: 41,
    mentions: 12,
    checks: 28,
    avgPosition: 3.2,
    lastChecked: "2h ago",
  },
  {
    id: "grok",
    mentionRate: 33,
    mentions: 9,
    checks: 28,
    avgPosition: 3.8,
    lastChecked: "3h ago",
  },
  {
    id: "kimi",
    mentionRate: 21,
    mentions: 6,
    checks: 28,
    avgPosition: 4.4,
    lastChecked: "3h ago",
  },
];

export const FEATURES_SHARE_FRAME = {
  heading: "Share of voice",
  subhead: "Brands named across 312 answers",
  footnote:
    "Sample numbers, made up for this page. Logos belong to their owners.",
};

export const FEATURES_SHARE_HEADERS = {
  brand: "Brand",
  type: "Type",
  share: "Share",
  mentions: "Mentions",
};

export const FEATURES_SHARE_ROWS: (ShareRow & { type: string })[] = [
  {
    id: "notra",
    brand: "Notra",
    logo: { src: "/notra-mark.svg" },
    share: 31,
    mentions: 96,
    color: "#8B5CF6",
    isYou: true,
    type: "You",
  },
  {
    id: "profound",
    brand: "Profound",
    logo: {
      src: "/logos/competitors/profound-light.svg",
      darkSrc: "/logos/competitors/profound-dark.svg",
    },
    share: 24,
    mentions: 74,
    color: "#F59E0B",
    type: "Direct",
  },
  {
    id: "prompting-company",
    brand: "The Prompting Company",
    logo: {
      src: "/logos/competitors/prompting-company.png",
      invertOnDark: true,
    },
    share: 17,
    mentions: 52,
    color: "#10B981",
    type: "Direct",
  },
  {
    id: "peec",
    brand: "Peec AI",
    logo: { src: "/logos/competitors/peec.png", invertOnDark: true },
    share: 12,
    mentions: 38,
    color: "#0EA5E9",
    type: "Direct",
  },
  {
    id: "promptwatch",
    brand: "Promptwatch",
    logo: { src: "/logos/competitors/promptwatch.svg" },
    share: 9,
    mentions: 28,
    color: "#F43F5E",
    type: "Direct",
  },
  {
    id: "bydefault",
    brand: "ByDefault",
    logo: { src: "/logos/competitors/bydefault.svg" },
    share: 7,
    mentions: 21,
    color: "#64748B",
    type: "Direct",
  },
];

export const FEATURES_TRAFFIC_FRAME = {
  heading: "AI Traffic",
  subhead: "AI crawlers and referrals visiting your site",
};

export const FEATURES_TRAFFIC_KPIS: KpiTile[] = [
  { id: "crawlers", label: "Crawlers", value: "1,204" },
  { id: "referrals", label: "Referrals", value: "318" },
  { id: "total", label: "Total", value: "1,522" },
];

export const FEATURES_TRAFFIC_HEADERS = {
  source: "Source",
  purpose: "Purpose",
  visits: "Visits",
  lastSeen: "Last seen",
};

export const FEATURES_TRAFFIC_ROWS: TrafficSourceRow[] = [
  {
    id: "t-1",
    source: "ChatGPT-User",
    engine: "chatgpt",
    purpose: "assistant-browse",
    visits: 412,
    lastSeen: "2s ago",
  },
  {
    id: "t-2",
    source: "PerplexityBot",
    engine: "perplexity",
    purpose: "search-index",
    visits: 287,
    lastSeen: "9s ago",
  },
  {
    id: "t-3",
    source: "ClaudeBot",
    engine: "claude",
    purpose: "training-crawler",
    visits: 198,
    lastSeen: "1m ago",
  },
  {
    id: "t-4",
    source: "GPTBot",
    engine: "chatgpt",
    purpose: "training-crawler",
    visits: 176,
    lastSeen: "31s ago",
  },
  {
    id: "t-5",
    source: "ChatGPT",
    engine: "chatgpt",
    purpose: "assistant-referral",
    visits: 154,
    lastSeen: "4m ago",
  },
  {
    id: "t-6",
    source: "Claude-User",
    engine: "claude",
    purpose: "assistant-browse",
    visits: 91,
    lastSeen: "14s ago",
  },
  {
    id: "t-7",
    source: "Perplexity",
    engine: "perplexity",
    purpose: "assistant-referral",
    visits: 63,
    lastSeen: "48s ago",
  },
];

export const FEATURES_GAPS_FRAME = {
  heading: "Content Gaps",
  subhead: "Questions engines answer without mentioning you",
};

export const FEATURES_GAP_HEADERS = {
  content: "Content",
  opportunity: "Opportunity",
  missing: "Missing engines",
  action: "Write",
};

export const FEATURES_GAP_ROWS: GapRow[] = [
  {
    id: "g-1",
    content: "What GEO metrics should a marketing team track?",
    opportunity: 5,
    mentionRate: 0,
    missing: ["chatgpt", "claude", "gemini", "perplexity", "grok"],
  },
  {
    id: "g-2",
    content: "Which GEO platforms work best for B2B SaaS?",
    opportunity: 4,
    mentionRate: 38,
    missing: ["claude", "gemini", "perplexity"],
  },
  {
    id: "g-3",
    content: "How do I get cited by Perplexity?",
    opportunity: 4,
    mentionRate: 0,
    missing: ["chatgpt", "claude", "gemini", "perplexity"],
  },
  {
    id: "g-4",
    content: "How do AI crawlers find and cite a website?",
    opportunity: 3,
    mentionRate: 20,
    missing: ["chatgpt", "gemini", "grok"],
  },
  {
    id: "g-5",
    content: "What is generative engine optimization?",
    opportunity: 2,
    mentionRate: 40,
    missing: ["gemini", "grok"],
  },
];
