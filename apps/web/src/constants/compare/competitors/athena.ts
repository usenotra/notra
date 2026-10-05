import type { CompareCompetitor } from "@/types/compare";

export const ATHENA: CompareCompetitor = {
  slug: "athenahq",
  name: "AthenaHQ",
  website: "https://www.athenahq.ai",
  logo: { src: "/logos/competitors/athena.svg", width: 500, height: 500 },
  summary:
    "YC-backed AEO platform with the widest engine list and an action agent. Credit-based, from free to $295.",
  headline: "A plan you can predict, with no credit math.",
  headlineAccent: "predict",
  heroSubtitle:
    "AthenaHQ covers eleven engines and pairs them with an action agent on credits. Notra gives you predictable plans, crawler logs below Enterprise and content that closes each gap.",
  metaDescription:
    "Notra vs AthenaHQ compared: engines, credits vs plans, crawler logs, content and pricing for AI search visibility.",
  chooseNotra: [
    "You want a predictable plan instead of credits that run out mid-month",
    "You want AI crawler logs without an Enterprise contract",
    "You want buyer personas and multi-turn conversations without Enterprise",
    "You want a paid plan between free and $295",
    "You want to see how answers are collected and how often",
  ],
  chooseCompetitor: [
    "You need Grok, DeepSeek, Meta AI, Mistral or Copilot tracked",
    "You run Shopify and want AI revenue attribution",
    "You want SOC 2 Type II, SSO and audit logs",
    "You want a free tier to start",
  ],
  advantages: [
    {
      title: "Plans you can predict",
      description:
        "Athena bills one credit per AI response. G2 reviewers report using a month of credits in the first week. Notra plans meter answers too, but you set the scan schedule per project and the prompt calculator shows the monthly count up front.",
    },
    {
      title: "Crawler logs on standard plans",
      description:
        "Athena lists bot and LLM traffic analytics on Enterprise. Notra logs 66 known AI agents and separates training, search and live answer fetches on its self-serve plans.",
    },
    {
      title: "Open method",
      description:
        "Athena does not say how it collects answers. Notra documents its method and keeps the raw answer, searches and sources behind every number. The code is open source.",
    },
  ],
  strengths: [
    {
      title: "Broadest engine list",
      description:
        "ChatGPT, Perplexity, AI Overviews, AI Mode, Gemini, Claude, Copilot, Grok, DeepSeek, Meta AI and Mistral on Starter.",
    },
    {
      title: "Action agent and content",
      description:
        "Action Center tasks, a content optimization agent, a Content Hub and publishing to Shopify and Webflow.",
    },
    {
      title: "Commerce and attribution",
      description:
        "Shopify revenue attribution, Shopify shopping pages and ChatGPT ads reporting.",
    },
    {
      title: "Enterprise controls",
      description:
        "SOC 2 Type II, SAML and OIDC SSO, audit logs, RBAC and BI exports. Customers include SoFi, Coinbase and PagerDuty.",
    },
  ],
  values: {
    chatgpt: true,
    claude: "Paid plan",
    gemini: true,
    perplexity: true,
    aiOverviews: true,
    copilot: true,
    otherEngines: "Paid plan",
    codingAgents: "Not listed",
    modelChoice: false,
    entryEngines: "5 free, 11 paid",
    collection: "Not disclosed",
    shareOfVoice: true,
    sentiment: true,
    citations: true,
    fanout: "Not listed",
    rawAnswers: true,
    personas: "Enterprise",
    conversations: "Not listed",
    languages: "Enterprise",
    frequency: "Not published",
    promptVolume: "Estimates",
    prompts: "Credit based",
    crawlerLogs: "Enterprise",
    referrals: true,
    conversions: true,
    siteAudit: true,
    gaps: true,
    contentWriting: true,
    socialPosts: "Not listed",
    rescan: "Not listed",
    githubPrs: "Not listed",
    commerce: true,
    api: "Add-on",
    mcp: true,
    openSource: false,
    zdr: "Not listed",
    soc2: true,
    startingPrice: "Free, then $295/mo",
  },
  plans: [
    {
      name: "Essential",
      price: "Free",
      detail: "300 credits, 5 engines, unlimited members.",
    },
    {
      name: "Starter",
      price: "$295/mo",
      detail: "3,600 credits a month, 8 to 11 engines, content agent.",
    },
    {
      name: "Enterprise",
      price: "Custom",
      detail: "ACE, Knowledge Base, multi-region, SSO, BI tools.",
    },
  ],
  pricingNote:
    "One credit equals one AI response. Annual billing brings Starter to $245 a month. The API and extra credits are paid add-ons.",
  faqs: [
    {
      question: "Is Notra an AthenaHQ alternative?",
      answer:
        "Yes. Both track brand visibility in AI answers and help you act on it. Athena covers more engines. Notra offers predictable plans, crawler logs below Enterprise and open source code.",
    },
    {
      question: "How do Athena credits compare to Notra?",
      answer:
        "Athena Starter includes 3,600 credits for $295. Tracking 50 prompts on 5 engines every day uses that in about two weeks. Notra Growth includes 6,000 answers for $250.",
    },
    {
      question: "Which engines does AthenaHQ track that Notra does not?",
      answer:
        "Copilot, Grok, DeepSeek, Meta AI and Mistral. Notra tracks ChatGPT, Claude, Gemini, Perplexity, Google AI Overviews and AI Mode.",
    },
  ],
};
