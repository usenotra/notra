import type { CompareCompetitor } from "@/types/compare";

export const OTTERLY: CompareCompetitor = {
  slug: "otterly",
  name: "Otterly.AI",
  website: "https://otterly.ai",
  logo: { src: "/logos/competitors/otterly.png", width: 112, height: 112 },
  summary:
    "Affordable, self-serve AI search monitoring for SEO teams and agencies. Engines beyond the core four are add-ons.",
  headline: "Every engine and content writing in one plan.",
  headlineAccent: "one plan",
  heroSubtitle:
    "Otterly is a low-cost monitoring tool with paid engine add-ons. Notra includes Claude and Gemini on every plan and writes the content that closes your gaps.",
  metaDescription:
    "Notra vs Otterly.AI compared: engines and add-ons, prompts, crawler analytics, content and pricing for AI search monitoring.",
  chooseNotra: [
    "You want Claude and Gemini without paying per engine",
    "You want Notra to write the content for you",
    "You want more than 100 prompts without stacking add-ons",
    "You want personas and multi-turn conversations",
  ],
  chooseCompetitor: [
    "You want to start at $29 a month",
    "You need Copilot tracked",
    "You are an agency that wants white-label reports and unlimited seats",
  ],
  advantages: [
    {
      title: "No per-engine add-ons",
      description:
        "Otterly charges extra for Gemini, AI Mode and Claude. Claude on Premium alone is $439 a month. Every Notra plan scans ChatGPT, Claude, Gemini, Perplexity, Google AI Overviews and AI Mode.",
    },
    {
      title: "Notra writes the post",
      description:
        "Otterly gives recommendations. Notra writes the brief and the post in your brand voice and rescans the prompt after you publish.",
    },
    {
      title: "Unlimited prompts",
      description:
        "Otterly plans include 15, 100 or 400 prompts. Notra prompts are unlimited, so you only manage the answer budget.",
    },
  ],
  strengths: [
    {
      title: "Lowest entry price",
      description:
        "Lite starts at $29 a month and annual billing saves 15%, with a free trial.",
    },
    {
      title: "Country targeting",
      description: "Every prompt runs daily and can be tied to a country.",
    },
    {
      title: "Agency friendly",
      description:
        "Unlimited seats and white-label reports for clients. Gartner Cool Vendor 2025 and a Semrush partner.",
    },
  ],
  values: {
    chatgpt: true,
    claude: "Add-on",
    gemini: "Add-on",
    perplexity: true,
    aiOverviews: true,
    copilot: true,
    otherEngines: false,
    codingAgents: false,
    modelChoice: false,
    entryEngines: "4",
    collection: "Real browser sessions",
    shareOfVoice: true,
    sentiment: true,
    citations: true,
    fanout: true,
    rawAnswers: "Not listed",
    personas: "Not listed",
    conversations: "Not listed",
    languages: "By country",
    frequency: "Daily",
    promptVolume: "Prompt research",
    prompts: "15 to 400",
    crawlerLogs: "Standard plan",
    referrals: "Not listed",
    conversions: "Not listed",
    siteAudit: true,
    gaps: "Recommendations",
    contentWriting: false,
    socialPosts: false,
    rescan: "Not listed",
    githubPrs: "Not listed",
    commerce: true,
    api: "Standard plan",
    mcp: "Standard plan",
    openSource: false,
    zdr: "Not listed",
    soc2: "Not listed",
    startingPrice: "$29/mo",
  },
  plans: [
    {
      name: "Lite",
      price: "$29/mo",
      detail: "15 prompts, 1 workspace, core engines.",
    },
    {
      name: "Standard",
      price: "$189/mo",
      detail: "100 prompts, API and MCP, agent analytics.",
    },
    {
      name: "Premium",
      price: "$489/mo",
      detail: "400 prompts, more audits and analytics events.",
    },
    {
      name: "Enterprise",
      price: "Custom",
      detail: "1,000+ prompts, SSO, success manager.",
    },
  ],
  pricingNote:
    "Gemini, AI Mode and Claude are add-ons from $9 to $439 a month depending on plan.",
  faqs: [
    {
      question: "Is Notra an Otterly.AI alternative?",
      answer:
        "Yes. Otterly is a strong low-cost monitor. Notra includes more engines on every plan and writes content, which suits teams that want to act on the data.",
    },
    {
      question: "Is Otterly cheaper than Notra?",
      answer:
        "At the entry level, yes. Lite is $29 for 15 prompts. Once you add Claude and Gemini on Standard you pay $189 plus $168 in add-ons, more than Notra Growth at $250.",
    },
    {
      question: "Does Otterly track Copilot?",
      answer:
        "Yes, Copilot is included on Otterly. Notra does not track Copilot today.",
    },
  ],
};
