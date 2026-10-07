export type StateOfAiSearchEngineId = "chatgpt" | "claude" | "ai-overview";

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

export interface StateOfAiSearchPromptRow {
  prompt: string;
  /** Brand named first most often across all answers to the prompt. */
  topPick: StateOfAiSearchBrand | null;
  /** Tracked brands named at least once, most frequent first. */
  brands: StateOfAiSearchBrand[];
  answers: number;
  /** Every engine named the same brand first. */
  consensus: boolean;
  aiOverviewShown: boolean;
}

export interface StateOfAiSearchSource {
  domain: string;
  /** Percent of answers citing the domain at least once. */
  share: number;
  byEngine: Record<StateOfAiSearchEngineId, number | null>;
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
  quotes: StateOfAiSearchQuote[];
}
