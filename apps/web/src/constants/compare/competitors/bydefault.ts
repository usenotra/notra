import type { CompareCompetitor } from "@/types/compare";

export const BYDEFAULT: CompareCompetitor = {
  slug: "bydefault",
  name: "ByDefault",
  website: "https://www.bydefault.so",
  logo: { src: "/logos/competitors/bydefault.svg", width: 22, height: 22 },
  summary:
    "New, developer-friendly GEO tool with daily runs, crawler logs and a content agent.",
  headline: "Citations counted from real answers.",
  headlineAccent: "real answers",
  heroSubtitle:
    "ByDefault runs your prompts daily on four engines. Notra lets you pick exact models and counts a citation only when an answer cites you. It also adds Perplexity, personas and social content on every plan.",
  metaDescription:
    "Notra vs ByDefault compared: engines per plan, data, crawler logs, content and pricing for AI visibility and GEO.",
  chooseNotra: [
    "You want to pick the exact model version",
    "You want citations counted only from real answers",
    "You want Perplexity tracked as an answer engine",
    "You want buyer personas and multi-turn conversations",
    "You want content on the entry plan, plus LinkedIn and X posts",
    "You need an API and MCP server to build on",
  ],
  chooseCompetitor: [
    "You want a bigger daily answer pool on the entry plan",
    "You want search volume next to every content gap",
    "You want unlimited seats on every plan",
  ],
  advantages: [
    {
      title: "Pick the exact model",
      description:
        "ByDefault plans let you choose 4 engines and do not track Perplexity answers. In Notra you pick the exact model you care about, across ChatGPT, Claude, Gemini, Perplexity and Google, and the list updates as new models ship.",
    },
    {
      title: "Citations from real answers",
      description:
        "A crawler reading your page is not a citation. When Meta's crawler fetches the same page ten times to train a model, that is ten fetches and zero citations. Notra counts a citation only when an engine cites your page in an answer, and labels training crawls separately.",
    },
    {
      title: "Content from the first plan",
      description:
        "ByDefault Starter includes no articles. Notra Starter includes 10 long-form posts and unlimited social posts a month, written in your brand voice. The Notra GitHub App opens pull requests too, and you can reply in the PR to ask for fixes.",
    },
    {
      title: "Personas and conversations",
      description:
        "Notra asks as generated buyer personas and replays multi-turn conversations, so you see answers beyond a single cold prompt.",
    },
  ],
  strengths: [
    {
      title: "Every prompt, every day",
      description:
        "Each plan's answer pool covers a daily run of every included prompt.",
    },
    {
      title: "Unlimited seats",
      description: "Every plan includes unlimited team members.",
    },
    {
      title: "Crawler logs in minutes",
      description:
        "Vercel log drain, Cloudflare worker or plain server logs, with cited pages and bot purpose.",
    },
  ],
  values: {
    chatgpt: true,
    claude: true,
    gemini: true,
    perplexity: false,
    aiOverviews: true,
    copilot: false,
    otherEngines: false,
    codingAgents: true,
    modelChoice: false,
    entryEngines: "4 of 8",
    collection: "Real browser sessions",
    shareOfVoice: true,
    sentiment: true,
    citations: "Crawler fetches",
    fanout: true,
    rawAnswers: true,
    personas: "Not listed",
    conversations: "Not listed",
    languages: "Not listed",
    frequency: "Daily",
    promptVolume: "Search volume",
    prompts: "50 to 350",
    crawlerLogs: true,
    referrals: "Not listed",
    conversions: "Not listed",
    siteAudit: "Not listed",
    gaps: true,
    contentWriting: "Growth plan",
    socialPosts: false,
    rescan: "Not listed",
    githubPrs: true,
    commerce: false,
    api: "Not listed",
    mcp: "Not listed",
    openSource: false,
    zdr: "Not listed",
    soc2: false,
    startingPrice: "$99/mo",
  },
  plans: [
    {
      name: "Starter",
      price: "$99/mo",
      detail: "50 prompts, 4 models, 6,000 answers, no articles.",
    },
    {
      name: "Growth",
      price: "$249/mo",
      detail: "150 prompts, 4 models, 18,000 answers, 5 articles.",
    },
    {
      name: "Scale",
      price: "$599/mo",
      detail: "350 prompts, 4 models, 42,000 answers, 10 articles.",
    },
  ],
  pricingNote:
    "No free plan or trial. Tracking pauses when the monthly answer pool runs out.",
  faqs: [
    {
      question: "Is Notra a ByDefault alternative?",
      answer:
        "Yes. Both track AI answers, log crawlers and write content. Notra covers Perplexity, adds personas and conversations and includes content on its entry plan.",
    },
    {
      question: "Does ByDefault track Perplexity?",
      answer:
        "ByDefault shows Perplexity in crawler analytics but does not track Perplexity answers. Notra scans Perplexity on every plan.",
    },
    {
      question: "How does Notra count citations differently from ByDefault?",
      answer:
        "ByDefault counts AI crawler fetches of your pages. Notra counts a citation only when an engine cites your page in an actual answer. A training crawler like Meta's can fetch one page ten times, which Notra logs as ten training crawls, not ten citations.",
    },
    {
      question: "Which is cheaper, ByDefault or Notra?",
      answer:
        "ByDefault starts at $99 and Notra at $100. ByDefault includes more daily answers. Notra includes every engine, unlimited prompts, 10 long-form posts and unlimited social posts.",
    },
  ],
};
