import type { CompareCompetitor } from "@/types/compare";

export const PROMPTING_COMPANY: CompareCompetitor = {
  slug: "the-prompting-company",
  name: "The Prompting Company",
  website: "https://promptingcompany.com",
  logo: {
    src: "/logos/competitors/prompting-company.png",
    width: 64,
    height: 64,
  },
  summary:
    "YC-backed agent experience platform for devtools. Visibility tracking plus coding-agent testing, priced on credits.",
  headline: "Track prompts daily without a $3,000 plan.",
  headlineAccent: "daily",
  heroSubtitle:
    "The Prompting Company tests how coding agents use your product and tracks AI visibility on credits. Notra tracks every engine on every plan and turns each gap into published content.",
  metaDescription:
    "Notra vs The Prompting Company compared: engines per plan, credits vs answers, crawler logs, content and pricing for AI visibility.",
  chooseNotra: [
    "You want daily tracking of all your prompts without jumping to a $3,000 plan",
    "You want Claude and Google AI Overviews on the entry plan",
    "You want to know how answers are collected and how often",
    "You want multi-turn conversations alongside buyer personas",
    "You want content written in your brand voice for blog, changelog and social",
  ],
  chooseCompetitor: [
    "You sell a devtool and want coding agents tested against your product in sandboxes",
    "You want CMS publishing to WordPress, Sanity, Webflow or Ghost",
    "You want a fully managed white-glove service",
    "Procurement needs SOC 2 and SAML SSO",
  ],
  advantages: [
    {
      title: "Daily tracking that fits the plan",
      description:
        "On TPC, 100 prompts on 4 engines every day is about 12,000 credits a month, the $3,000 White-glove tier. Notra plans meter answers, and you choose daily, weekly or monthly per project.",
    },
    {
      title: "All engines from the start",
      description:
        "TPC Basic covers ChatGPT, Perplexity and Gemini, with Google AI on Pro and Claude above that. Notra scans ChatGPT, Claude, Gemini, Perplexity and AI Overviews on every plan.",
    },
    {
      title: "Clear method",
      description:
        "Notra documents how it asks each engine, how often it runs and what one tracked answer means. Every number links to the raw answer, sources and searches behind it.",
    },
  ],
  strengths: [
    {
      title: "Agent experience testing",
      description:
        "Runs Claude Code, Codex and OpenCode against your product in sandboxes and scores each run with transcripts and fixes. It is on the Enterprise plan.",
    },
    {
      title: "Fully managed option",
      description:
        "The $3,000 White-glove plan comes with a dedicated success manager, weekly reports and custom reports.",
    },
    {
      title: "Content and CMS publishing",
      description:
        "A knowledge-base grounded content agent with drafts for WordPress, Sanity, Webflow, Ghost and Prismic.",
    },
    {
      title: "Crawler logs and enterprise",
      description:
        "Cloudflare Worker, Logpush or raw event ingestion, plus SOC 2 Type II and SAML SSO. Backed by a $6.5M seed from Peak XV and YC.",
    },
  ],
  values: {
    chatgpt: true,
    claude: "$3,000 plan",
    gemini: true,
    perplexity: true,
    aiOverviews: "Pro plan",
    copilot: false,
    otherEngines: "$3,000 plan",
    codingAgents: "Enterprise",
    modelChoice: false,
    entryEngines: "3",
    collection: "Not disclosed",
    shareOfVoice: true,
    sentiment: true,
    citations: true,
    fanout: "Not listed",
    rawAnswers: true,
    personas: true,
    conversations: "Not listed",
    languages: "1 below $3,000",
    frequency: "Not published",
    promptVolume: false,
    prompts: "25 to 100",
    crawlerLogs: true,
    referrals: true,
    conversions: "Not listed",
    siteAudit: true,
    gaps: true,
    contentWriting: "Pro plan",
    socialPosts: "Not listed",
    rescan: "Not listed",
    githubPrs: "Not listed",
    commerce: false,
    api: true,
    mcp: true,
    openSource: false,
    zdr: "Not listed",
    soc2: true,
    startingPrice: "$99/mo",
  },
  plans: [
    {
      name: "Basic",
      price: "$99/mo",
      detail: "1,000 credits, 25 prompts, ChatGPT, Perplexity and Gemini.",
    },
    {
      name: "Pro",
      price: "$299/mo",
      detail: "4,000 credits, 100 prompts, adds Google AI, 8 articles.",
    },
    {
      name: "White-glove",
      price: "$3,000/mo",
      detail: "12,000 credits, all engines, 50 articles, managed service.",
    },
    {
      name: "Enterprise",
      price: "Custom",
      detail: "Agent experience testing, SAML SSO, SLA.",
    },
  ],
  pricingNote:
    "One AI response costs one credit per region and one article costs 20 credits.",
  faqs: [
    {
      question: "Is Notra an alternative to The Prompting Company?",
      answer:
        "For AI visibility tracking and content, yes. If your main need is testing how coding agents use your devtool, TPC's agent experience product is more specialised.",
    },
    {
      question: "How do credits compare to Notra's AI answers?",
      answer:
        "Both count one engine answer as one unit. TPC Basic includes 1,000 credits for $99. Notra Starter includes 2,000 answers, every engine and 10 long-form posts for $100.",
    },
    {
      question: "Does Notra track coding agents?",
      answer:
        "Notra can scan Claude Code, Codex and OpenCode in early access. TPC goes further with scored sandbox runs on its Enterprise plan.",
    },
  ],
};
