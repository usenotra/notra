import type { CompareCompetitor } from "@/types/compare";

export const PROMPTWATCH: CompareCompetitor = {
  slug: "promptwatch",
  name: "Promptwatch",
  website: "https://promptwatch.com",
  logo: {
    src: "/logos/competitors/promptwatch.svg",
    width: 1179,
    height: 1179,
  },
  summary:
    "Full-stack AI search platform from Amsterdam with broad engine coverage, crawler logs and a content agent. Daily scans only.",
  headline: "Pick the exact model you want to track.",
  headlineAccent: "exact model",
  heroSubtitle:
    "Promptwatch tracks ten engines and publishes to WordPress and Webflow. Notra lets you pick exact models, set your own scan schedule and includes crawler logs and content on its first plan.",
  metaDescription:
    "Notra vs Promptwatch compared: engines and exact models, scan schedule, crawler logs, content, API and pricing for AI search visibility.",
  chooseNotra: [
    "You want to pick the exact model version",
    "You want crawler logs and content on the first paid plan",
    "You want to scan weekly or monthly to cover more prompts per dollar",
    "You want multi-turn conversations, open source code and zero data retention",
  ],
  chooseCompetitor: [
    "You need Copilot, Grok, DeepSeek or Alexa tracked",
    "You want crawler logs from CloudFront, Fastly or Akamai",
    "You want auto-publishing to WordPress or Webflow",
    "You want a free plan or city-level targeting",
  ],
  advantages: [
    {
      title: "Pick the exact model",
      description:
        "Promptwatch lets you choose engines and retires old versions for you. In Notra you pick the exact model, like Claude Opus 5.5 or Gemini 3.1 Pro, and the list updates as new models ship.",
    },
    {
      title: "Crawler logs and content on the first plan",
      description:
        "Promptwatch Essential at $95 includes no crawler logs and no articles. Both start on Professional at $245. Notra Starter at $100 includes crawler logs, 10 long-form posts and unlimited LinkedIn and X posts.",
    },
    {
      title: "Your scan schedule, unlimited prompts",
      description:
        "Promptwatch runs every prompt daily, and plans cap prompts at 50, 150 or 350. Notra prompts are unlimited and you choose daily, weekly or monthly scans per project.",
    },
    {
      title: "Follow-up questions",
      description:
        "Buyers rarely stop at one question. Notra replays multi-turn conversations of up to five turns so you see where you drop out of the answer.",
    },
  ],
  strengths: [
    {
      title: "Broad engine coverage",
      description:
        "ChatGPT, Gemini, Perplexity, Copilot, Alexa, Google AI, Claude, DeepSeek, Grok and Mistral, run from the monitor's country.",
    },
    {
      title: "Free plan and big answer pools",
      description:
        "A free plan with 10 ChatGPT prompts, and 6,000 responses a month on the $95 Essential plan.",
    },
    {
      title: "Deep log integrations",
      description:
        "Crawler logs from Cloudflare, CloudFront, Fastly, Vercel, Netlify, Akamai, Google Cloud CDN, a WordPress plugin and a custom endpoint.",
    },
    {
      title: "CMS publishing and commerce",
      description:
        "Drafts that publish to WordPress and Webflow, plus Shopping Insights, Ads Radar, city targeting and SSO.",
    },
  ],
  values: {
    chatgpt: true,
    claude: true,
    gemini: true,
    perplexity: true,
    aiOverviews: true,
    copilot: true,
    otherEngines: true,
    codingAgents: true,
    modelChoice: false,
    entryEngines: "All on paid plans",
    collection: "Real interfaces, APIs for some",
    shareOfVoice: true,
    sentiment: true,
    citations: true,
    fanout: true,
    rawAnswers: true,
    personas: true,
    conversations: "Not listed",
    languages: "Country, state, city",
    frequency: "Daily only",
    promptVolume: "Keyword volume",
    prompts: "50 to 350",
    crawlerLogs: "Professional plan",
    referrals: true,
    conversions: true,
    siteAudit: true,
    gaps: true,
    contentWriting: "Professional plan",
    socialPosts: false,
    rescan: "Not listed",
    githubPrs: "Not listed",
    commerce: true,
    api: true,
    mcp: true,
    openSource: false,
    zdr: "Not listed",
    soc2: "Not listed",
    startingPrice: "Free, then $95/mo",
  },
  plans: [
    {
      name: "Explore",
      price: "Free",
      detail: "10 prompts on ChatGPT only, 1 project.",
    },
    {
      name: "Essential",
      price: "$95/mo",
      detail:
        "50 prompts, 6,000 responses, 1 seat. No crawler logs or articles.",
    },
    {
      name: "Professional",
      price: "$245/mo",
      detail:
        "150 prompts, 18,000 responses, crawler logs, 5 articles, 2 seats.",
    },
    {
      name: "Business",
      price: "$579/mo",
      detail: "350 prompts, 42,000 responses, 10 articles, city targeting.",
    },
  ],
  pricingNote:
    "Annual billing gets two months free. Agency plans run from $199 to $799 a month. Enterprise is custom.",
  faqs: [
    {
      question: "Is Notra a Promptwatch alternative?",
      answer:
        "Yes. Both track AI answers, log AI crawlers and write content. Notra adds exact model choice, a flexible scan schedule, multi-turn conversations and includes crawler logs and content on its first plan.",
    },
    {
      question: "Does Promptwatch let you pick exact models?",
      answer:
        "No. Promptwatch lets you choose engines and replaces old model versions as providers ship new ones. Notra lets you pick the exact model, like GPT-5.6 Sol or Claude Opus 5.5.",
    },
    {
      question: "Which engines does Promptwatch track that Notra does not?",
      answer:
        "Microsoft Copilot, Alexa, Grok, DeepSeek, Mistral and Meta Llama. Notra tracks ChatGPT, Claude, Gemini, Perplexity, Google AI Overviews and AI Mode.",
    },
    {
      question: "How does prompt demand data compare?",
      answer:
        "Both use search keyword data, since only the AI labs know how often a prompt is asked. Promptwatch buys keyword volume from DataForSEO. Notra uses your own Google Search Console data.",
    },
  ],
};
