import { homedir } from "node:os";
import { join } from "node:path";

export type ReportEngine =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "perplexity"
  | "ai-overview";

/** Monthly edition slug; the report is dated by `REPORT_TODAY`. */
export const REPORT_EDITION = process.env.SOAS_EDITION ?? "2026-10";
export const REPORT_TODAY =
  process.env.SOAS_TODAY ?? new Date().toISOString().slice(0, 10);

/** Consumer assistants, with models pinned for within-edition comparability. */
export const ENGINE_MODELS: Record<ReportEngine, string> = {
  chatgpt: "openai/gpt-5.6-sol",
  claude: "anthropic/claude-opus-5.5",
  gemini: "google/gemini-3.8-flash",
  perplexity: "perplexity/sonar",
  "ai-overview": "google/ai-overview",
};

/** Ten LLM samples per prompt; AI Overview is checked once. */
export const SAMPLES_PER_ENGINE: Record<ReportEngine, number> = {
  chatgpt: 10,
  claude: 10,
  gemini: 10,
  perplexity: 10,
  "ai-overview": 1,
};

export const RAW_ROOT = join(homedir(), ".notra-state-of-ai-search", "raw");

export function rawAnswerPath(
  category: string,
  engine: ReportEngine,
  promptIndex: number,
  sample: number
): string {
  return join(
    RAW_ROOT,
    REPORT_EDITION,
    category,
    engine,
    `${String(promptIndex).padStart(2, "0")}-${sample}.json`
  );
}

export interface RawSource {
  url: string;
  title: string | null;
  domain: string;
}

export interface RawAnswer {
  category: string;
  promptIndex: number;
  prompt: string;
  engine: ReportEngine;
  model: string;
  sample: number;
  collectedAt: string;
  /** False when Google showed no AI Overview for the query. */
  present: boolean;
  text: string;
  sources: RawSource[];
  /** Web searches the model ran; missing on answers collected before 2026-10-08. */
  searchQueries?: string[];
  /** Gateway billing, including BYOK market-cost estimates, and token usage; absent on pre-expansion cache. */
  billing?: {
    cost: number;
    inputTokens: number;
    outputTokens: number;
    reported: boolean;
  };
  /** Provider metadata preserves grounding and billing evidence, never credentials. */
  providerMetadata?: unknown;
  /** SerpApi's structured overview, kept to render it block by block. */
  overview: { text_blocks: unknown; references: unknown } | null;
}
