import type { CompareCompetitor } from "@/types/compare";

export const JAM: CompareCompetitor = {
  slug: "jam",
  name: "Jam",
  website: "https://www.spreadjam.com",
  logo: { src: "/logos/competitors/jam.png", width: 112, height: 160 },
  summary:
    "Growth agent for founders that bundles GEO with SEO, cold email and social listening. Light on visibility analytics.",
  headline: "A tool built only for AI visibility.",
  headlineAccent: "AI visibility",
  heroSubtitle:
    "Jam is a cheap all-round growth agent where AI search is one of five channels. Notra is built for AI visibility, with five engines, sentiment, sources and crawler logs.",
  metaDescription:
    "Notra vs Jam (spreadjam.com) compared: AI visibility tracking, engines, crawler logs, content and pricing.",
  chooseNotra: [
    "AI visibility is your main job",
    "You need Google AI Overviews, sentiment and source analysis",
    "You want to see which AI crawlers read your site",
    "You want more than 75 tracked questions",
    "You want buyer personas and multi-turn conversations",
  ],
  chooseCompetitor: [
    "You want cold email, lead search and social listening in the same tool",
    "You are a solo founder with a $29 budget",
    "You chat with your agent from Slack, iMessage or WhatsApp",
  ],
  advantages: [
    {
      title: "More data per answer",
      description:
        "Jam tracks a visibility score and citation rate. Notra adds position, sentiment, the sources each engine cited and the searches it ran for every answer.",
    },
    {
      title: "More engines from day one",
      description:
        "Jam Starter covers Gemini and Perplexity, with ChatGPT and Claude from Pro. Notra scans ChatGPT, Claude, Gemini, Perplexity and AI Overviews on every plan.",
    },
    {
      title: "Crawler and referral logs",
      description:
        "Notra logs AI crawler visits and referral clicks so you know which pages engines read and which answers send buyers.",
    },
  ],
  strengths: [
    {
      title: "Low entry price",
      description: "Plans start at $29 a month per workspace, not per seat.",
    },
    {
      title: "Chat from anywhere",
      description:
        "Talk to the agent from Slack, Discord, iMessage, Telegram or WhatsApp.",
    },
    {
      title: "Many channels in one agent",
      description:
        "Prospect search, verified emails, cold email with warm-up, Reddit and X listening and SEO audits next to GEO.",
    },
  ],
  values: {
    chatgpt: "Pro plan",
    claude: "Pro plan",
    gemini: true,
    perplexity: true,
    aiOverviews: false,
    copilot: false,
    otherEngines: false,
    codingAgents: false,
    modelChoice: false,
    entryEngines: "2",
    collection: "Not disclosed",
    shareOfVoice: true,
    sentiment: false,
    citations: true,
    fanout: "Not listed",
    rawAnswers: "Not listed",
    personas: "Not listed",
    conversations: "Not listed",
    languages: "Not listed",
    frequency: "Daily",
    promptVolume: false,
    prompts: "15 to 75",
    crawlerLogs: false,
    referrals: "Not listed",
    conversions: "Not listed",
    siteAudit: true,
    gaps: true,
    contentWriting: "Pro plan",
    socialPosts: false,
    rescan: "Not listed",
    githubPrs: "Pro plan",
    commerce: false,
    api: true,
    mcp: true,
    openSource: false,
    zdr: "Not listed",
    soc2: "Not listed",
    startingPrice: "$29/mo",
  },
  plans: [
    {
      name: "Starter",
      price: "$29/mo",
      detail: "1,000 credits, 15 questions on Gemini and Perplexity.",
    },
    {
      name: "Pro",
      price: "$99/mo",
      detail: "4,000 credits, 35 questions on 4 engines, articles as PRs.",
    },
    {
      name: "Hyper Growth",
      price: "$249/mo",
      detail: "11,000 credits, 75 questions on 4 engines.",
    },
    {
      name: "Enterprise",
      price: "Custom",
      detail: "Custom credits, seats and SLA.",
    },
  ],
  pricingNote:
    "No free plan or trial. An article costs 20 credits. AI search tracking does not use credits.",
  faqs: [
    {
      question: "Is Notra a Jam alternative?",
      answer:
        "For AI visibility, yes. Jam is a broad growth agent where GEO is one channel. Notra focuses on AI visibility with deeper data and content in your brand voice.",
    },
    {
      question: "Which engines does Jam track?",
      answer:
        "ChatGPT, Perplexity, Gemini and Claude, with only Gemini and Perplexity on Starter. Notra adds Google AI Overviews and covers all five on every plan.",
    },
    {
      question: "Does Jam have AI crawler logs?",
      answer:
        "We could not find crawler or referral analytics on Jam's site. Notra logs 66 known AI agents and AI referral clicks.",
    },
  ],
};
