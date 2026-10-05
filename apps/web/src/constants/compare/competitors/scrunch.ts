import type { CompareCompetitor } from "@/types/compare";

export const SCRUNCH: CompareCompetitor = {
  slug: "scrunch",
  name: "Scrunch",
  website: "https://scrunch.com",
  logo: { src: "/logos/competitors/scrunch.svg", width: 144, height: 144 },
  summary:
    "Enterprise AI customer experience platform, now part of Sitecore. Seven engines and an edge layer for AI bots.",
  headline: "Find the gap and publish the fix.",
  headlineAccent: "publish the fix",
  heroSubtitle:
    "Scrunch tracks seven engines and serves AI bots a lighter copy of your site at the edge. Notra starts at a third of the price and writes content for the prompts you lose.",
  metaDescription:
    "Notra vs Scrunch compared: engines, data collection, crawler logs, content and pricing for AI search visibility.",
  chooseNotra: [
    "Your budget starts closer to $100 than $300 a month",
    "You want a writer that turns gaps into posts",
    "You want to scan daily for as long as you like",
    "You want multi-turn conversations alongside buyer personas",
    "You want open source code and zero data retention",
  ],
  chooseCompetitor: [
    "You need Copilot and Meta AI tracked",
    "You want AXP to serve AI bots a machine-readable copy of each page",
    "You are on Sitecore or want an enterprise vendor with SOC 2 Type II",
  ],
  advantages: [
    {
      title: "A third of the entry price",
      description:
        "Scrunch starts at $300 a month. Notra Starter is $100 with all five engines, unlimited prompts and 10 long-form posts.",
    },
    {
      title: "Gaps turned into posts",
      description:
        "Scrunch shows where you are missing but does not write content. Notra ranks gaps by opportunity, writes the brief and the draft and rescans after you publish.",
    },
    {
      title: "Your scan schedule",
      description:
        "Scrunch runs new prompts daily for 14 days, then every 72 hours by default. Notra lets you keep daily scans or pick any interval up to 90 days.",
    },
  ],
  strengths: [
    {
      title: "Seven engines on every plan",
      description:
        "ChatGPT, Claude, Gemini, Perplexity, Google AI and Meta AI on every plan, with no engine add-ons.",
    },
    {
      title: "Agent Experience Platform",
      description:
        "AXP detects AI bots at the CDN edge and serves a compressed, machine-readable page. Scrunch cites a 364% lift for Akamai on non-branded prompts.",
    },
    {
      title: "Enterprise scale",
      description:
        "SOC 2 Type II, RBAC, multi-site setups, a Data API and Looker Studio. Over 500 customers including Lenovo and Skims. Sitecore bought Scrunch in June 2026.",
    },
  ],
  values: {
    chatgpt: true,
    claude: true,
    gemini: true,
    perplexity: true,
    aiOverviews: true,
    copilot: true,
    otherEngines: "Meta AI",
    codingAgents: "Not listed",
    modelChoice: false,
    entryEngines: "7",
    collection: "Browser and APIs",
    shareOfVoice: true,
    sentiment: true,
    citations: true,
    fanout: "Not listed",
    rawAnswers: true,
    personas: true,
    conversations: "Not listed",
    languages: "By country",
    frequency: "Every 72 hours",
    promptVolume: "Not listed",
    prompts: "350 to 700",
    crawlerLogs: true,
    referrals: "Via GA4",
    conversions: "Not listed",
    siteAudit: true,
    gaps: "Not listed",
    contentWriting: false,
    socialPosts: false,
    rescan: "Manual refresh",
    githubPrs: "Not listed",
    commerce: false,
    api: true,
    mcp: "Not listed",
    openSource: false,
    zdr: "Not listed",
    soc2: true,
    startingPrice: "$300/mo",
  },
  plans: [
    {
      name: "Starter",
      price: "$300/mo",
      detail: "350 custom prompts, 3 personas, 3 seats, 7-day trial.",
    },
    {
      name: "Growth",
      price: "$500/mo",
      detail: "700 custom prompts, 5 personas, 5 seats.",
    },
    {
      name: "Enterprise",
      price: "Custom",
      detail: "Custom prompts, personas and seats.",
    },
  ],
  pricingNote:
    "Annual billing saves 17%, bringing Starter to $250 a month. All plans include all 7 engines.",
  faqs: [
    {
      question: "Is Notra a Scrunch alternative?",
      answer:
        "Yes, especially for smaller teams. Scrunch is an enterprise platform from $300 a month. Notra starts at $100 and adds content writing to tracking.",
    },
    {
      question: "What happened to Scrunch after the Sitecore deal?",
      answer:
        "Sitecore bought Scrunch in June 2026. Scrunch still runs as its own product and will be built into SitecoreAI over time.",
    },
    {
      question: "Does Notra have something like Scrunch AXP?",
      answer:
        "No. Notra does not rewrite your pages at the edge. It logs which pages AI crawlers read and helps you write content that answers the prompts you lose.",
    },
  ],
};
