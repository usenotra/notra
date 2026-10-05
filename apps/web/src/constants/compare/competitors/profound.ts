import type { CompareCompetitor } from "@/types/compare";

export const PROFOUND: CompareCompetitor = {
  slug: "profound",
  name: "Profound",
  website: "https://www.tryprofound.com",
  logo: {
    src: "/logos/competitors/profound-light.svg",
    width: 32,
    height: 32,
  },
  summary:
    "Enterprise AI marketing suite with deep monitoring. Since September 2026 brands need a sales call to buy.",
  headline: "AI visibility you can buy without a sales call.",
  headlineAccent: "without a sales call",
  heroSubtitle:
    "Profound is a strong enterprise suite with nine engines and its own prompt volume data. Notra gives you tracking, crawler logs and content in one self-serve plan from $100 a month.",
  metaDescription:
    "Notra vs Profound compared: engines, data, crawler logs, content and pricing. Profound is enterprise-only for brands. Notra starts self-serve at $100/mo.",
  chooseNotra: [
    "You want to sign up today without a demo, a contract or a sales cycle",
    "You want the gap, the draft and the rescan in one place",
    "You want to see the full answer, sources and searches behind every number",
    "You want multi-turn conversations alongside buyer personas",
    "Your team cares about open source code and zero data retention",
  ],
  chooseCompetitor: [
    "You need Copilot, DeepSeek or ChatGPT Shopping tracked",
    "You want prompt volume data on what real users ask AI assistants",
    "Procurement needs SOC 2, SSO and SCIM on day one",
    "You have an enterprise budget and want a dedicated success team",
  ],
  advantages: [
    {
      title: "Sign up without a sales call",
      description:
        "Profound removed its self-serve brand plans in September 2026. Its free trial runs a fixed prompt set on three engines for seven days. Notra plans start at $100 a month with your own prompts on every engine from day one.",
    },
    {
      title: "Gap, brief, post and rescan",
      description:
        "Notra ranks the prompts you lose, writes an evidence-backed brief, drafts the post in your brand voice and rescans that prompt when you publish, so you see if the fix worked.",
    },
    {
      title: "The answer behind every number",
      description:
        "Each check keeps the raw answer, the searches the engine ran, the sources it cited, your position and sentiment. You can check every number yourself.",
    },
    {
      title: "Open source and zero retention",
      description:
        "Notra's code is public under AGPL-3.0, so you can read how each number is computed. A zero data retention add-on keeps your prompts out of model provider logs.",
    },
  ],
  strengths: [
    {
      title: "Nine engines on Enterprise",
      description:
        "ChatGPT, Perplexity, Google AI, Gemini, Copilot, DeepSeek, Claude and Exa, tracked daily across 150+ regions.",
    },
    {
      title: "Prompt Volumes",
      description:
        "A dataset of what people ask AI assistants, sold as built from over a billion real prompts across 35 countries. Notra uses your real Search Console keyword data instead.",
    },
    {
      title: "Agent Analytics and log integrations",
      description:
        "Crawler and referral analytics with spoofed-bot detection and log sources from AWS, Cloudflare, Akamai, Fastly, Vercel and more.",
    },
    {
      title: "Enterprise readiness",
      description:
        "SOC 2, SSO, SCIM, RBAC, ChatGPT Shopping, Ads Studio and an AI Marketer with agents. Backed by about $335M in funding and used by a third of the Fortune 100.",
    },
  ],
  values: {
    chatgpt: true,
    claude: "Enterprise",
    gemini: true,
    perplexity: "Enterprise",
    aiOverviews: true,
    copilot: "Enterprise",
    otherEngines: "DeepSeek on Enterprise",
    codingAgents: false,
    modelChoice: false,
    entryEngines: "3 on the trial",
    collection: "Real browser sessions",
    shareOfVoice: true,
    sentiment: true,
    citations: true,
    fanout: "Not listed",
    rawAnswers: true,
    personas: true,
    conversations: "Not listed",
    languages: "100+ languages",
    frequency: "Daily",
    promptVolume: "Prompt panel",
    prompts: "Custom",
    crawlerLogs: true,
    referrals: true,
    conversions: true,
    siteAudit: "Not listed",
    gaps: true,
    contentWriting: true,
    socialPosts: "Not listed",
    rescan: "Not listed",
    githubPrs: true,
    commerce: true,
    api: "Enterprise",
    mcp: "Enterprise",
    openSource: false,
    zdr: "Not listed",
    soc2: true,
    startingPrice: "Custom",
  },
  plans: [
    {
      name: "Trial",
      price: "Free, 7 days",
      detail:
        "50 preset prompts on ChatGPT, Gemini and AI Overviews. No editing, exports or API.",
    },
    {
      name: "Enterprise",
      price: "Custom",
      detail:
        "Up to 9 engines, custom prompts and regions, API, SSO and dedicated support.",
    },
    {
      name: "Agency Growth",
      price: "$99/mo + $399 per client",
      detail: "100 prompts on 3 engines per client workspace.",
    },
  ],
  pricingNote:
    "Profound's $99 Starter and $399 Growth brand plans were retired in September 2026.",
  faqs: [
    {
      question: "Is Notra a Profound alternative?",
      answer:
        "Yes. Both track how AI engines talk about your brand. Profound is now an enterprise suite sold through sales. Notra is self-serve from $100 a month and adds content writing and rescans on top of tracking.",
    },
    {
      question: "Does Notra track as many engines as Profound?",
      answer:
        "Not all of them. Notra scans ChatGPT, Claude, Gemini, Perplexity, Google AI Overviews and AI Mode on every plan. Profound Enterprise also covers Copilot, DeepSeek and Exa.",
    },
    {
      question: "Does Notra have prompt volume data like Profound?",
      answer:
        "AI labs do not publish how often a prompt is asked, so every prompt volume number is an estimate from a panel. Notra connects Google Search Console and shows real search data for the keywords inside your prompts. Profound's Prompt Volumes is a larger dataset if you want a panel estimate.",
    },
    {
      question: "Can Notra write content like Profound's AI Marketer?",
      answer:
        "Yes. Notra turns content gaps into briefs and drafts in your brand voice for your blog, changelog, LinkedIn and X, then rescans the prompt after you publish.",
    },
  ],
};
