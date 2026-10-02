import type {
  FeatureCrawlerPageRow,
  FeatureCrawlerReason,
  FeatureCrawlerReasonTotal,
  FeatureDetailCopy,
  FeatureEngineLabel,
} from "@/types/feature-detail-page";

export const AI_CRAWLER_LOGS_PAGE: FeatureDetailCopy = {
  meta: {
    path: "/features/ai-crawler-logs",
    title: "AI Crawler Logs",
    description:
      "Notra logs every AI crawler visit to your site, tags it as training, search or a live answer and shows which pages each engine reads.",
    ogImageKey: "aiCrawlerLogs",
  },
  heroSubtitle:
    "AI engines read your site before they answer. Notra logs every bot visit, splits training crawls from live lookups and shows which pages they read.",
  signupSource: "feature_ai_crawler_logs",
  overview: {
    heading: "The visitors your analytics never see",
    description:
      "AI crawlers skip JavaScript, so tag-based analytics miss them. Notra logs each request on your server, so you see which pages each engine read.",
    facts: [
      {
        title: "Training, search or a live answer",
        description:
          "Notra tags each visit as a training crawl, a search index refresh, a live answer or a referral click.",
      },
      {
        title: "Find the pages they skip",
        description:
          "See which pages each engine keeps reading and which ones it has never opened.",
      },
    ],
  },
  steps: {
    heading: "Crawler logs in three steps",
    items: [
      {
        title: "Connect your site",
        description:
          "Add your ingest token to your middleware or edge config. It takes a few minutes and works on any stack.",
      },
      {
        title: "Bots get sorted",
        description:
          "Notra matches each request to a known AI crawler and labels why it came, so a stray scraper never counts as ChatGPT.",
      },
      {
        title: "See what they read",
        description:
          "Track the pages engines fetch, the ones they ignore and the clicks that come back from AI answers.",
      },
    ],
  },
  cta: {
    heading: "See your site the way AI engines do",
    subcopy:
      "Connect your site and see which pages AI crawlers read. Free to start.",
  },
};

export const AI_CRAWLER_REASON_BAR_CLASS: Record<FeatureCrawlerReason, string> =
  {
    Training: "bg-[#E3A15A]",
    "Search index": "bg-[#6F95D0]",
    "Live answer": "bg-[#8B5CF6]",
    Referral: "bg-[#4FAE73]",
  };

export const AI_CRAWLER_VISITS_TOTAL = "4,812";

export const AI_CRAWLER_VISITS_CHANGE = "+38% vs last week";

export const AI_CRAWLER_REASON_TOTALS: FeatureCrawlerReasonTotal[] = [
  { reason: "Training", count: "2,310", share: 48 },
  { reason: "Search index", count: "1,402", share: 29 },
  { reason: "Live answer", count: "884", share: 18 },
  { reason: "Referral", count: "216", share: 5 },
];

export const AI_CRAWLER_PAGE_COLUMNS: FeatureEngineLabel[] = [
  { engine: "chatgpt", label: "OpenAI" },
  { engine: "claude", label: "Anthropic" },
  { engine: "perplexity", label: "Perplexity" },
];

export const AI_CRAWLER_PAGE_ROWS: FeatureCrawlerPageRow[] = [
  { path: "/pricing", counts: ["412", "208", "166"], lastVisit: "2 min ago" },
  {
    path: "/docs/integrations/github",
    counts: ["276", "191", "302"],
    lastVisit: "14 min ago",
  },
  { path: "/changelog", counts: ["188", "94", null], lastVisit: "1 h ago" },
  { path: "/compare/profound", counts: [null, null, null], lastVisit: "Never" },
];
