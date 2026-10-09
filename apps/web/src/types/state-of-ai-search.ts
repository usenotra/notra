export type StateOfAiSearchEngineId =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "perplexity"
  | "ai-overview";

export interface StateOfAiSearchBrand {
  name: string;
  domain: string;
}

export interface StateOfAiSearchEngine {
  id: StateOfAiSearchEngineId;
  label: string;
  /** Gateway model ID, used to resolve the engine icon. */
  model: string;
  /** Answers with content; AI Overview only counts queries that showed one. */
  answers: number;
  /** Tracked brands named per answer, on average. */
  brandsPerAnswer: number;
  /** Distinct cited pages per answer, on average. */
  sourcesPerAnswer: number;
}

export interface StateOfAiSearchRankingRow extends StateOfAiSearchBrand {
  rank: number;
  /** Percent of answers naming the brand, averaged across engines. */
  visibility: number;
  /** Percent of answers that name the brand before any other tracked brand. */
  topPick: number;
  /** Percent of answers that cite a page on the brand's own domain. */
  ownSiteCited: number;
  /** Percent per engine; null when the engine gave no answers. */
  byEngine: Record<StateOfAiSearchEngineId, number | null>;
  /** Points against the previous edition; null for the first edition. */
  delta: number | null;
}

/** One engine's answer to a prompt, kept for the prompt drawer. */
export interface StateOfAiSearchPromptAnswer {
  engine: StateOfAiSearchEngineId;
  /** Markdown answer with inline citations removed; empty for AI Overview. */
  text: string;
  /** Google's overview blocks; only set for AI Overview. */
  overview: StateOfAiSearchOverview | null;
  /** Tracked brands in order of first mention. */
  mentioned: string[];
  /** Cited pages, in the order the answer linked them. */
  sources: { url: string; title: string | null; domain: string }[];
  /** What the assistant searched for; empty for AI Overview and older runs. */
  searchQueries: string[];
  /** The sentence that introduces each tracked brand, in answer order. */
  highlights: { brand: string; text: string; match: string }[];
  collectedAt: string;
}

export interface StateOfAiSearchPromptRow {
  id: number;
  prompt: string;
  /** Brand named first most often across all answers to the prompt. */
  topPick: StateOfAiSearchBrand | null;
  /** Tracked brands named at least once, most frequent first. */
  brands: StateOfAiSearchBrand[];
  answers: number;
  /** Every engine named the same brand first. */
  consensus: boolean;
  aiOverviewShown: boolean;
  /** Answers naming each brand, keyed by brand name. */
  mentions: Record<string, number>;
  /** Answers that name each brand first, keyed by brand name. */
  firsts: Record<string, number>;
  /** First sample per engine. */
  responses: StateOfAiSearchPromptAnswer[];
}

export interface StateOfAiSearchSource {
  domain: string;
  /** Percent of answers citing the domain, averaged across engines like visibility. */
  share: number;
  byEngine: Record<StateOfAiSearchEngineId, number | null>;
  /** Answers citing the domain at least once. */
  citations: number;
  /** Pages on the domain, most-cited first. */
  pages: { url: string; title: string | null; citations: number }[];
  /** Prompts whose answers cite the domain, most first. */
  prompts: {
    id: number;
    citations: number;
    engines: StateOfAiSearchEngineId[];
  }[];
}

export type StateOfAiSearchOverviewBlock =
  | { type: "paragraph"; text: string; refs: number[] }
  | { type: "heading"; text: string }
  | { type: "list"; items: { text: string; refs: number[] }[] };

export interface StateOfAiSearchOverview {
  query: string;
  blocks: StateOfAiSearchOverviewBlock[];
  references: { index: number; title: string; url: string; source: string }[];
}

export interface StateOfAiSearchQuote {
  engine: StateOfAiSearchEngineId;
  prompt: string;
  text: string;
  collectedAt: string;
}

export interface StateOfAiSearchReport {
  slug: string;
  /** Monthly edition, `YYYY-MM`. */
  edition: string;
  editionLabel: string;
  /** ISO date the answers were collected. */
  publishedAt: string;
  subject: string;
  noun: string;
  engines: StateOfAiSearchEngine[];
  totals: {
    prompts: number;
    answers: number;
    brands: number;
    citedDomains: number;
    /** Percent of prompts where every engine put the same brand first. */
    consensus: number;
    /** Percent of prompts that showed a Google AI Overview. */
    aiOverviewShown: number;
  };
  ranking: StateOfAiSearchRankingRow[];
  prompts: StateOfAiSearchPromptRow[];
  sources: StateOfAiSearchSource[];
  overview: StateOfAiSearchOverview | null;
  /** Up to three quotes per brand, keyed by brand name. */
  quotes: Record<string, StateOfAiSearchQuote[]>;
}

/** What listings need, so they can skip the full report. */
export interface StateOfAiSearchSummary extends Pick<
  StateOfAiSearchReport,
  | "slug"
  | "edition"
  | "editionLabel"
  | "publishedAt"
  | "subject"
  | "noun"
  | "engines"
> {
  leaders: StateOfAiSearchRankingRow[];
}
