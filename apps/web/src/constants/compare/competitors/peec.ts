import type { CompareCompetitor } from "@/types/compare";

export const PEEC: CompareCompetitor = {
  slug: "peec",
  name: "Peec AI",
  website: "https://peec.ai",
  logo: { src: "/logos/competitors/peec.png", width: 180, height: 180 },
  summary:
    "Popular self-serve AI search analytics for marketing teams. Strong dashboards, three engines per plan.",
  headline: "Every engine on every plan, with no add-ons.",
  headlineAccent: "no add-ons",
  heroSubtitle:
    "Peec AI is an analytics dashboard with published pricing. Notra tracks every engine on every plan, then writes the content that closes your gaps.",
  metaDescription:
    "Notra vs Peec AI compared: engines per plan, data, crawler logs, content and pricing. See where each AI visibility tool fits best.",
  chooseNotra: [
    "You want ChatGPT, Claude, Gemini, Perplexity and AI Overviews without paying per engine",
    "You want content written and published from your gaps",
    "You want to ask questions in multi-turn conversations and as buyer personas",
    "You want unlimited prompts and choose how often each one runs",
  ],
  chooseCompetitor: [
    "You need Copilot or Naver tracked",
    "You want AI shopping and ChatGPT ads tracking",
    "You want to track in many countries and up to 115 languages",
    "You want a 7-day free trial with no card",
  ],
  advantages: [
    {
      title: "Every engine, no add-ons",
      description:
        "Peec's self-serve plans let you pick 3 models. Perplexity is a paid add-on and Claude needs Enterprise. Every Notra plan scans ChatGPT, Claude, Gemini, Perplexity and AI Overviews.",
    },
    {
      title: "Notra writes the content",
      description:
        "Peec reports what is happening and suggests actions, but it does not write content. Notra turns each gap into a brief and a draft in your brand voice, then rescans after you publish.",
    },
    {
      title: "Prompts are not capped",
      description:
        "Peec plans include 50, 150 or 350 prompts. Notra plans meter AI answers instead, so you can track hundreds of prompts weekly or a few dozen daily.",
    },
    {
      title: "Follow-ups and personas",
      description:
        "Buyers rarely ask one question. Notra replays multi-turn conversations and asks as generated buyer personas, so you see where you drop out.",
    },
  ],
  strengths: [
    {
      title: "Clean, affordable analytics",
      description:
        "Published pricing from $95 a month, unlimited seats on every plan and a clean dashboard.",
    },
    {
      title: "Wide model menu on Enterprise",
      description:
        "Up to 13 models including Copilot, Naver, Grok, DeepSeek, Qwen, Mistral and Meta Muse.",
    },
    {
      title: "Shopping, ads and brand perception",
      description:
        "SKU-level AI shopping visibility, a ChatGPT ads library and attribute scoring with fact checks against your own brand facts.",
    },
    {
      title: "Sources and crawler data",
      description:
        "Query fan-outs, source gap analysis and crawler logs from Vercel, Cloudflare, AWS, Akamai and others.",
    },
  ],
  values: {
    chatgpt: true,
    claude: "Enterprise",
    gemini: true,
    perplexity: "Add-on",
    aiOverviews: true,
    copilot: true,
    otherEngines: "Enterprise",
    codingAgents: false,
    modelChoice: "Enterprise",
    entryEngines: "3 of 6",
    collection: "Real browser sessions",
    shareOfVoice: true,
    sentiment: true,
    citations: true,
    fanout: true,
    rawAnswers: true,
    personas: true,
    conversations: "Not listed",
    languages: "115 languages",
    frequency: "Daily",
    promptVolume: "Estimated score",
    prompts: "50 to 350",
    crawlerLogs: true,
    referrals: true,
    conversions: "Not listed",
    siteAudit: true,
    gaps: true,
    contentWriting: false,
    socialPosts: false,
    rescan: "Not listed",
    githubPrs: "Not listed",
    commerce: true,
    api: true,
    mcp: true,
    openSource: false,
    zdr: "Not listed",
    soc2: false,
    startingPrice: "$95/mo",
  },
  plans: [
    {
      name: "Starter",
      price: "$95/mo",
      detail: "50 prompts, 3 models, 1 country, 4,500 answers a month.",
    },
    {
      name: "Pro",
      price: "$245/mo",
      detail: "150 prompts, 3 models, 3 countries, 13,500 answers a month.",
    },
    {
      name: "Advanced",
      price: "$495/mo",
      detail: "350 prompts, 3 models, multi-country, Looker Studio.",
    },
    {
      name: "Enterprise",
      price: "Custom",
      detail: "Up to 13 models, API, SSO and dedicated support.",
    },
  ],
  pricingNote:
    "Annual billing saves about 15%. Each extra model costs $35 to $165 a month depending on plan.",
  faqs: [
    {
      question: "Is Notra a good Peec AI alternative?",
      answer:
        "If you want tracking and content in one tool, yes. Peec is a strong analytics dashboard. Notra tracks every engine on every plan and writes the posts that close your gaps.",
    },
    {
      question: "Which engines does Peec AI track compared to Notra?",
      answer:
        "Peec self-serve plans pick 3 of ChatGPT, AI Mode, AI Overviews, Copilot, Gemini and Naver, with Perplexity as an add-on and Claude on Enterprise. Notra scans ChatGPT, Claude, Gemini, Perplexity, Google AI Overviews and AI Mode on every plan.",
    },
    {
      question: "Is Peec AI cheaper than Notra?",
      answer:
        "Peec starts at $95 a month and Notra at $100. Peec includes more raw answers on its entry plan. Notra includes every engine, unlimited prompts and 10 long-form posts a month.",
    },
    {
      question: "How does Notra measure prompt demand compared to Peec?",
      answer:
        "Only the AI labs know how often a prompt is really asked. Peec gives each prompt an estimated volume score from 1 to 5. Notra connects Google Search Console and shows real search data for the keywords in your prompts.",
    },
    {
      question: "Does Notra have crawler analytics like Peec?",
      answer:
        "Yes. Notra logs 66 known AI agents through a small server middleware and keeps training crawls, live answer fetches and referral clicks apart.",
    },
  ],
};
