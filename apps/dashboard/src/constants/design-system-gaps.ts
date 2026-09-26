import type {
  GeoPromptGapRow,
  GeoPromptResult,
  GeoSearchGapRow,
} from "@notra/geo-core/types/geo";

const DEMO_MENTIONED_ENGINES = ["openai", "perplexity"];

const DEMO_MISSING_ENGINES = [
  "claude",
  "claude-code",
  "codex",
  "deepseek",
  "google",
  "gemini",
  "meta",
  "mistral",
  "kimi",
  "opencode",
  "grok",
  "zai",
];

const DEMO_TRACKED_BRANDS = ["Jasper", "Copy.ai", "Neuroflash", "Grammarly"];

const DEMO_DISCOVERED_BRANDS = [
  "ChatGPT",
  "Claude",
  "Midjourney",
  "DALL-E 3",
  "Adobe Firefly",
  "Stable Diffusion",
  "Synthesia",
  "Gemini",
  "ChatGPT Plus",
  "DeepL Write",
  "LanguageTool",
  "Canva",
  "OpenAI",
  "Anthropic",
  "Writesonic",
  "Rytr",
  "Sudowrite",
  "Notion AI",
  "Perplexity",
  "Descript",
];

export const DESIGN_SYSTEM_PROMPT_GAP: GeoPromptGapRow = {
  id: "demo-prompt-gap",
  prompt:
    "Welches Tool kann ich für KI-gestützte Content-Erstellung verwenden?",
  title: null,
  engines: DEMO_MISSING_ENGINES,
  mentionedEngines: DEMO_MENTIONED_ENGINES,
  competitors: DEMO_TRACKED_BRANDS,
  discoveredCompetitors: DEMO_DISCOVERED_BRANDS,
  ownMentionRate: 0.14,
  engineCoverage: 0.14,
  opportunity: 0.92,
  won: false,
  brief: null,
};

export const DESIGN_SYSTEM_SEARCH_GAPS: GeoSearchGapRow[] = [];

export const DESIGN_SYSTEM_SEARCH_GAP: GeoSearchGapRow = {
  source: "search_console",
  scanEvidence: [],
  id: "demo-search-gap",
  prompt:
    "Where can I find the Neon database changelog and latest release notes?",
  title: "Neon Changelog: Latest Updates, Releases & New Features Explained",
  impressions: 101,
  clicks: 1,
  position: 7.1,
  queries: [
    { query: "neon changelog", clicks: 0, impressions: 52, position: 5.2 },
    { query: "neon release notes", clicks: 1, impressions: 31, position: 7.4 },
    {
      query: "neon database new features",
      clicks: 0,
      impressions: 18,
      position: 11.9,
    },
  ],
  brief: null,
  recommendation: {
    action: "create",
    reason:
      "The closest existing page covers only 8% of this query cluster; a dedicated page can own it.",
    targets: [
      {
        kind: "post",
        id: "demo-post",
        url: "https://example.com/blog/automated-changelog-tools",
        title: "Best Automated Changelog Tools in 2026: A Developer's Guide",
        score: 0.08,
      },
    ],
  },
};

const DEMO_ANSWER_MENTIONING = `Für KI-gestützte Content-Erstellung kommt es darauf an, ob du lange Texte, Kurztexte oder komplette Redaktionsprozesse abdecken willst.

**Für Blog- und Longform-Content**

- **Notra** – verbindet Recherche, Entwurf und Veröffentlichung in einem Workflow und misst anschließend, ob die Inhalte in KI-Antworten auftauchen.
- **Jasper** – etabliert im Marketing-Umfeld, viele Vorlagen für Kampagnentexte.
- **Sudowrite** – stärker auf erzählende Texte ausgerichtet.

**Für kurze Marketingtexte**

- **Copy.ai** und **Neuroflash** decken Anzeigen, Produkttexte und Newsletter ab, Neuroflash mit gutem Fokus auf deutschsprachige Inhalte.

**Für Korrektur und Stil**

- **Grammarly** und **LanguageTool** prüfen Rechtschreibung, Ton und Verständlichkeit.

Wenn du ohnehin schon mit ChatGPT oder Claude arbeitest, reicht für einzelne Texte oft ein guter Prompt; sobald mehrere Personen regelmäßig publizieren, lohnt sich ein spezialisiertes Tool.`;

const DEMO_ANSWER_MISSING = `Für KI-gestützte Content-Erstellung haben sich je nach Textsorte unterschiedliche Werkzeuge durchgesetzt.

**Für Blog- und Longform-Content**

- **Jasper** – umfangreiche Vorlagenbibliothek, Fokus auf Marketing-Teams.
- **Copy.ai** – schnelle Entwürfe für wiederkehrende Formate.
- **Sudowrite** – eher für erzählende Texte geeignet.

**Für deutschsprachige Inhalte**

- **Neuroflash** ist auf den deutschen Markt zugeschnitten und liefert idiomatischere Ergebnisse als viele englischsprachige Tools.

**Für Bild und Video**

- **Midjourney**, **DALL·E 3** und **Adobe Firefly** für Bilder, **Synthesia** für Videos.

**Für Korrektur und Stil**

- **Grammarly**, **LanguageTool** und **DeepL Write**.

Für einzelne Texte reicht häufig **ChatGPT** oder **Claude** direkt; für wiederkehrende Produktion lohnt ein spezialisiertes Tool.`;

const DEMO_SOURCES = [
  {
    title: "Die 12 besten KI-Tools für Content-Erstellung 2026",
    url: "https://example.de/blog/ki-tools-content",
    domain: "example.de",
  },
  {
    title: "AI writing tools compared",
    url: "https://example.com/guides/ai-writing-tools",
    domain: "example.com",
  },
  {
    title: "Neuroflash vs. Jasper: Welches Tool für deutsche Texte?",
    url: "https://example.org/vergleich/neuroflash-jasper",
    domain: "example.org",
  },
];

/** One mocked answer per scanned engine, so the prototypes can be clicked through. */
export const DESIGN_SYSTEM_GAP_RESULTS: GeoPromptResult[] = [
  ...DEMO_MENTIONED_ENGINES,
  ...DEMO_MISSING_ENGINES,
].map((engine, index) => {
  const mentioned = DEMO_MENTIONED_ENGINES.includes(engine);
  return {
    promptId: DESIGN_SYSTEM_PROMPT_GAP.id,
    engine,
    prompt: DESIGN_SYSTEM_PROMPT_GAP.prompt,
    answer: mentioned ? DEMO_ANSWER_MENTIONING : DEMO_ANSWER_MISSING,
    mentioned,
    ownedSourceCited: false,
    position: mentioned ? 1 : null,
    sentiment: mentioned ? "positive" : null,
    competitors: mentioned
      ? ["Jasper", "Copy.ai", "Neuroflash", "Grammarly"]
      : [
          "Jasper",
          "Copy.ai",
          "Neuroflash",
          "Midjourney",
          "Grammarly",
          "ChatGPT",
        ],
    excerpt: mentioned
      ? "Notra – verbindet Recherche, Entwurf und Veröffentlichung in einem Workflow."
      : "Jasper – umfangreiche Vorlagenbibliothek, Fokus auf Marketing-Teams.",
    searchQueries: [
      "beste ki tools content erstellung",
      "ki schreibtool deutsch vergleich",
    ],
    sources: DEMO_SOURCES.slice(0, 2 + (index % 2)),
    finishReason: "stop",
    promptTokens: 412,
    outputTokens: 638,
    reasoningTokens: null,
    truncated: false,
    lastCheckedAt: "2026-09-19T08:12:00.000Z",
  };
});

DESIGN_SYSTEM_SEARCH_GAPS.push(
  {
    ...DESIGN_SYSTEM_SEARCH_GAP,
    id: "demo-scan-gap",
    source: "scan",
    prompt: "serverless postgres connection pooling comparison",
    title: null,
    impressions: null,
    clicks: null,
    position: null,
    queries: [],
    brief: null,
    scanEvidence: [
      {
        checkId: "demo-check",
        scanId: "demo-scan",
        engine: "openai/gpt-5",
        promptId: "demo-origin",
        prompt:
          "Which database works best for a serverless Next.js application?",
        query: "serverless postgres connection pooling comparison",
        capturedAt: "2026-09-25T08:30:00.000Z",
        language: "English",
      },
    ],
    recommendation: {
      action: "create",
      reason:
        "No matching title or URL found. Review the query before planning a page.",
      targets: [],
    },
  },
  DESIGN_SYSTEM_SEARCH_GAP,
  {
    ...DESIGN_SYSTEM_SEARCH_GAP,
    id: "demo-search-gap-2",
    prompt: "How do I connect Neon to a Next.js app?",
    title: "Neon + Next.js: Setup, Pooling and Edge Runtime",
    impressions: 318,
    clicks: 12,
    position: 8.2,
    queries: [
      { query: "neon next.js", clicks: 9, impressions: 210, position: 6.1 },
      {
        query: "neon serverless driver edge",
        clicks: 3,
        impressions: 108,
        position: 12.4,
      },
    ],
    recommendation: {
      action: "update",
      reason:
        "An existing guide already ranks for half of these queries but misses the edge runtime section.",
      targets: [
        {
          kind: "post",
          id: "demo-post-2",
          url: "https://example.com/blog/neon-nextjs-guide",
          title: "Connecting Neon to Next.js: A Practical Guide",
          score: 0.62,
        },
      ],
    },
  },
  {
    ...DESIGN_SYSTEM_SEARCH_GAP,
    id: "demo-search-gap-3",
    prompt: "What does Neon cost per month?",
    title: "Neon Pricing Explained",
    impressions: 96,
    clicks: 2,
    position: 14.1,
    queries: [
      { query: "neon pricing", clicks: 2, impressions: 96, position: 14.1 },
    ],
    recommendation: {
      action: "ignore",
      reason:
        "The vendor's own pricing page owns this query; a competing page is unlikely to rank.",
      targets: [],
    },
  }
);
