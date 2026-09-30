import type { AgentReadinessParsedReport } from "../types/agent-readiness";
import type { GeoSampleProfile } from "../types/geo-sample";
import type { GeoModelTokenUsage } from "../types/token-usage";
import { GEO_OPENCODE_ENGINE_ID } from "./geo";
import { GEO_SAMPLE_ENGINES } from "./geo-sample";

/** Mention rate for engines the sample catalog does not list. */
export const GEO_DEMO_DEFAULT_MENTION_RATE = 0.55;

export const GEO_DEMO_BRAND_TRAITS: readonly string[] = [
  "strong summaries and a clean editor, popular with small teams.",
  "best-in-class search across meetings, with Slack and Linear sync.",
  "affordable and quick to set up, but limited integrations.",
  "docs-first workspace where meeting notes are one feature of many.",
  "privacy-focused with EU data residency for regulated teams.",
];

export const GEO_DEMO_USAGE: GeoModelTokenUsage = {
  inputTokens: 420,
  inputTokenDetails: {
    noCacheTokens: 420,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  },
  outputTokens: 180,
  outputTokenDetails: { textTokens: 180, reasoningTokens: 0 },
  totalTokens: 600,
  modelId: "notra-demo",
  totalUsd: 0,
};

/** Engines the demo fabricates history for (grounded + one coding agent). */
const GEO_DEMO_ENGINE_IDS: readonly string[] = [
  "openai/gpt-5.4-grounded",
  "openai/gpt-5.4",
  "perplexity-sonar",
  "anthropic/claude-sonnet-4.6-grounded",
  "google/gemini-3-flash-grounded",
  GEO_OPENCODE_ENGINE_ID,
];

/**
 * GEO sample data for the public demo. Fieldnote and every competitor are
 * fictional and use reserved `.example` domains so the demo never makes
 * claims about real companies.
 */
export const GEO_DEMO_PROFILE: GeoSampleProfile = {
  projectName: "fieldnote.example",
  days: 30,
  competitors: [
    {
      name: "Quillboard",
      domain: "quillboard.example",
      synonyms: ["Quill Board"],
      kind: "direct",
    },
    {
      name: "Notably",
      domain: "notably.example",
      synonyms: ["Notably AI"],
      kind: "direct",
    },
    {
      name: "Paperline",
      domain: "paperline.example",
      synonyms: [],
      kind: "direct",
    },
    {
      name: "Brieflet",
      domain: "brieflet.example",
      synonyms: [],
      kind: "direct",
    },
    {
      name: "Memoria",
      domain: "memoria.example",
      synonyms: ["Memoria Docs"],
      kind: "indirect",
    },
    {
      name: "Stackpad",
      domain: "stackpad.example",
      synonyms: [],
      kind: "indirect",
    },
  ],
  prompts: [
    {
      english: "What is the best AI meeting notes app for remote teams?",
      german: "Was ist die beste KI-App für Meeting-Notizen in Remote-Teams?",
    },
    {
      english: "What are good Quillboard alternatives for startups?",
      german: "Was sind gute Quillboard-Alternativen für Startups?",
    },
    {
      english: "Which note-taking tool summarizes Zoom calls automatically?",
      german: "Welches Notiz-Tool fasst Zoom-Calls automatisch zusammen?",
    },
    {
      english: "How do I build a team knowledge base from meeting notes?",
      german: "Wie baue ich aus Meeting-Notizen eine Team-Wissensdatenbank?",
    },
    {
      english: "Which AI note apps integrate with Slack and Linear?",
      german:
        "Welche KI-Notiz-Apps lassen sich mit Slack und Linear verbinden?",
    },
    {
      english: "Is there a privacy-friendly AI note taker for EU companies?",
      german:
        "Gibt es einen datenschutzfreundlichen KI-Notizdienst für EU-Firmen?",
    },
    {
      english: "Notably vs Paperline: which is better for product teams?",
      german:
        "Notably oder Paperline: Was eignet sich besser für Produktteams?",
    },
    {
      english:
        "What's the easiest way to share meeting decisions with my team?",
      german:
        "Wie teile ich Meeting-Entscheidungen am einfachsten mit dem Team?",
    },
    {
      english: "Which meeting notes tool has the best search?",
      german: "Welches Meeting-Notiz-Tool hat die beste Suche?",
    },
    {
      english: "What AI tools help engineering managers run 1:1s?",
      german: "Welche KI-Tools helfen Engineering-Managern bei 1:1s?",
    },
  ],
  sequences: [
    {
      name: "Buyer research",
      steps: [
        "Our team loses decisions in meeting chaos. What tools could help?",
        "How do those compare on search and integrations?",
        "Which one would you pick for a 20-person product team?",
      ],
    },
    {
      name: "Switching from Quillboard",
      steps: [
        "We use Quillboard but it's getting expensive. What else is out there?",
        "Which of those can import our existing notes?",
        "Recommend one for a remote-first startup.",
      ],
    },
  ],
  sources: [
    {
      title: "The 9 best AI meeting note takers in 2026",
      url: "https://www.saascompare.example/best-ai-meeting-notes",
      domain: "saascompare.example",
    },
    {
      title: "Quillboard vs Fieldnote: an honest comparison",
      url: "https://theremotestack.example/quillboard-vs-fieldnote",
      domain: "theremotestack.example",
    },
    {
      title: "How we run async standups with AI notes",
      url: "https://engineeringleads.example/async-standups",
      domain: "engineeringleads.example",
    },
    {
      title: "Fieldnote pricing",
      url: "https://www.fieldnote.example/pricing",
      domain: "fieldnote.example",
    },
    {
      title: "Notably review: great summaries, weak search",
      url: "https://productivityweekly.example/notably-review",
      domain: "productivityweekly.example",
    },
    {
      title: "r/ProductManagement: what do you use for meeting notes?",
      url: "https://www.reddit.com/r/ProductManagement/comments/meeting-notes-tools/",
      domain: "reddit.com",
    },
    {
      title: "Paperline: docs for fast teams",
      url: "https://paperline.example/",
      domain: "paperline.example",
    },
    {
      title: "Building a knowledge base from meetings",
      url: "https://docs.fieldnote.example/guides/knowledge-base",
      domain: "docs.fieldnote.example",
    },
  ],
  codingAgentSources: [
    {
      title: "Fieldnote API reference",
      url: "https://docs.fieldnote.example/api",
      domain: "docs.fieldnote.example",
    },
    {
      title: "Quillboard developer docs",
      url: "https://developers.quillboard.example/",
      domain: "developers.quillboard.example",
    },
    {
      title: "Notably SDK on GitHub",
      url: "https://github.com/notably-example/sdk",
      domain: "github.com",
    },
  ],
  trafficPaths: [
    "/pricing",
    "/changelog",
    "/blog/ai-meeting-notes-guide",
    "/blog/knowledge-base-from-meetings",
    "/docs/api",
    "/docs/quickstart",
    "/integrations/slack",
    "/customers",
  ],
  trafficHosts: [
    "www.fieldnote.example",
    "docs.fieldnote.example",
    "app.fieldnote.example",
  ],
  // A lean engine set keeps each sandbox around 5 MB instead of 13 MB.
  engines: GEO_SAMPLE_ENGINES.filter((engine) =>
    GEO_DEMO_ENGINE_IDS.includes(engine.engine)
  ),
  germanChecks: false,
  excerpts: {
    mentioned:
      "{brand} is a strong pick for AI meeting notes and team knowledge, alongside {competitors}.",
    missing:
      "For AI meeting notes, popular options are {competitors}. The answer does not mention the company.",
    mentionedGerman:
      "{brand} wird oft für KI-Meeting-Notizen und Team-Wissen empfohlen, neben {competitors}.",
    missingGerman:
      "Für KI-Meeting-Notizen werden {competitors} genannt, die eigene Marke fehlt.",
  },
};

/** Long enough that 30- and 90-day traffic ranges have a previous period. */
export const GEO_DEMO_TRAFFIC_DAYS = 180;
export const GEO_DEMO_TRAFFIC_CACHE_MS = 5 * 60 * 1000;
/** Traffic arrays are ~180 days each; cap how many a process keeps. */
export const GEO_DEMO_TRAFFIC_CACHE_MAX_ENTRIES = 50;

/** Agent readiness report the demo returns instead of calling is-agentic. */
export const GEO_DEMO_AGENT_READINESS_REPORT: Omit<
  AgentReadinessParsedReport,
  "scannedAt"
> = {
  score: 72,
  scoreLabel: null,
  scoreBreakdown: {
    essential: { earned: 42, available: 50, passing: 5, total: 6 },
    recommended: { earned: 24, available: 40, passing: 3, total: 5 },
    bonus: { points: 6, positiveSignals: 2 },
  },
  issues: [
    {
      id: "llms-txt",
      name: "llms.txt",
      tier: "essential",
      result: "failed",
      details: "No /llms.txt was found on www.fieldnote.example.",
      recommendation:
        "Publish an /llms.txt that links your docs, pricing and changelog so agents can find them without crawling.",
    },
    {
      id: "markdown-negotiation",
      name: "Markdown responses",
      tier: "recommended",
      result: "partial",
      details:
        "Docs pages return Markdown for Accept: text/markdown; the marketing site does not.",
      recommendation:
        "Serve Markdown versions of /pricing and /customers when agents ask for text/markdown.",
    },
    {
      id: "structured-data",
      name: "Product structured data",
      tier: "recommended",
      result: "failed",
      details: "The pricing page has no SoftwareApplication or Offer schema.",
      recommendation:
        "Add JSON-LD with plan names and prices so assistants quote current pricing.",
    },
  ],
  eligibleChecks: 11,
  reportUrl: null,
};
