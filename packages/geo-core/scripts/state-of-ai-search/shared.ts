import { homedir } from "node:os";
import { join } from "node:path";

export type ReportEngine = "chatgpt" | "claude" | "ai-overview";

/** Monthly edition slug; the report is dated by `REPORT_TODAY`. */
export const REPORT_EDITION = process.env.SOAS_EDITION ?? "2026-10";
export const REPORT_TODAY =
  process.env.SOAS_TODAY ?? new Date().toISOString().slice(0, 10);

/** Same engines the GEO dashboard scans by default. */
export const ENGINE_MODELS: Record<ReportEngine, string> = {
  chatgpt: "openai/gpt-5.6-sol",
  claude: "anthropic/claude-opus-5.5",
  "ai-overview": "google/ai-overview",
};

/** Google's overview barely varies between calls, so it is asked once. */
export const SAMPLES_PER_ENGINE: Record<ReportEngine, number> = {
  chatgpt: 2,
  claude: 2,
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
  /** SerpApi's structured overview, kept to render it block by block. */
  overview: { text_blocks: unknown; references: unknown } | null;
}
