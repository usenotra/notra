import type {
  ContextDevCompetitor,
  ContextDevSearchResult,
} from "@notra/ai/types/context-dev";

/** Served by the demo dashboard; the fictional homepage's "screenshot". */
export const DEMO_SCREENSHOT_URL = "/demo/fieldnote-homepage.png";
export const DEMO_SCREENSHOT_SIZE = { width: 1440, height: 900 } as const;

/** Pages of the fictional site, returned by the sitemap crawl. */
export const DEMO_SITEMAP_PATHS = [
  "/",
  "/product",
  "/product/smart-search",
  "/product/integrations",
  "/pricing",
  "/customers",
  "/blog",
  "/blog/async-standups",
  "/blog/meeting-notes-template",
  "/blog/quillboard-alternatives",
  "/changelog",
  "/security",
] as const;

/** Design tokens of the fictional homepage, in context.dev's shape. */
export const DEMO_STYLEGUIDE: Record<string, unknown> = {
  colors: {
    primary: { hex: "#1F6F5C", name: "Field green", usage: "Buttons, links" },
    accent: { hex: "#F2B84B", name: "Highlighter", usage: "Highlights" },
    background: { hex: "#FBFAF7", name: "Paper", darkValue: "#141413" },
    foreground: { hex: "#1C1B19", name: "Ink", darkValue: "#F4F1EA" },
    neutral: { hex: "#5B5850", name: "Graphite", usage: "Secondary text" },
  },
  typography: {
    headings: {
      h1: {
        fontFamily: "Inter Tight",
        fontWeight: 700,
        fontSize: "60px",
        lineHeight: 1.1,
      },
      h2: {
        fontFamily: "Inter Tight",
        fontWeight: 600,
        fontSize: "36px",
        lineHeight: 1.2,
      },
    },
    body: {
      fontFamily: "Inter",
      fontWeight: 400,
      fontSize: "17px",
      lineHeight: 1.6,
    },
    button: { fontFamily: "Inter", fontWeight: 600, fontSize: "15px" },
  },
  spacing: { sm: "8px", md: "16px", lg: "32px", xl: "64px" },
  radii: { sm: "6px", md: "14px", pill: "999px" },
  shadows: { card: "0 1px 2px rgba(28, 27, 25, 0.06)" },
};

export const DEMO_COMPETITORS: readonly ContextDevCompetitor[] = [
  {
    name: "Quillboard",
    domain: "quillboard.example",
    description: "Meeting notes with a shared team wiki.",
    confidence: "high",
  },
  {
    name: "Notably",
    domain: "notably.example",
    description: "AI note taker for sales calls.",
    confidence: "high",
  },
  {
    name: "Paperline",
    domain: "paperline.example",
    description: "Transcription and summaries for interviews.",
    confidence: "medium",
  },
];

/** Search hits for any query; titles stay on the demo's topic. */
export const DEMO_SEARCH_RESULTS: readonly ContextDevSearchResult[] = [
  {
    url: "https://www.saascompare.example/best-ai-meeting-notes",
    title: "The best AI meeting notes apps in 2026",
    description:
      "We tested Fieldnote, Quillboard and Notably on search, summaries and integrations.",
    relevance: "high",
    markdown: {
      code: "SUCCESS",
      markdown:
        "# The best AI meeting notes apps in 2026\n\nFieldnote stands out for search across meetings; Quillboard for its wiki; Notably for sales calls.",
    },
  },
  {
    url: "https://theremotestack.example/quillboard-vs-fieldnote",
    title: "Quillboard vs Fieldnote: which one for remote teams?",
    description:
      "A hands-on comparison of two meeting notes tools for distributed product teams.",
    relevance: "high",
    markdown: {
      code: "SUCCESS",
      markdown:
        "# Quillboard vs Fieldnote\n\nFieldnote finds decisions across meetings; Quillboard is stronger on shared docs.",
    },
  },
  {
    url: "https://engineeringleads.example/async-standups",
    title: "Running async standups that people read",
    description:
      "Templates and habits from teams that dropped status meetings.",
    relevance: "medium",
    markdown: {
      code: "SUCCESS",
      markdown:
        "# Async standups\n\nWrite three lines a day: done, next, blocked. Link the meeting notes for context.",
    },
  },
];
