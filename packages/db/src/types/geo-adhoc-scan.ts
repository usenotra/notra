import type { GeoCheckGrounding, GeoCheckSourceItem } from "./geo-checks";

export interface GeoAdhocScanInput {
  prompt: string;
  /** Catalog model ids. They do not have to be tracked by the project. */
  engines: string[];
  /** Off runs the bare model answer instead of its web-search variant. */
  webSearch: boolean;
  language: string;
}

/** One engine's answer, shaped like a `geo_mention_checks` row. */
export interface GeoAdhocScanCheck {
  engine: string;
  prompt: string;
  answer: string;
  mentioned: boolean;
  ownedSourceCited: boolean;
  position: number | null;
  sentiment: string | null;
  competitors: string[];
  excerpt: string;
  grounding: GeoCheckGrounding;
  sources: GeoCheckSourceItem[];
  language: string;
  finishReason: string | null;
  promptTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  zdrEnforced: boolean | null;
  capturedAt: string;
}

export interface GeoAdhocScanResults {
  checks: GeoAdhocScanCheck[];
  /** Engines that were requested but produced no check, with the reason. */
  skipped: { engine: string; reason: "zdr" | "no_web_search" | "failed" }[];
}
