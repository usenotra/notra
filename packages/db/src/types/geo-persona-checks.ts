import type { GeoCheckGrounding, GeoCheckSourceItem } from "./geo-checks";
import type { GeoPersonaSnapshot } from "./geo-personas";

export interface GeoCheckPersonaResultRow {
  scanId: string;
  personaId: string;
  personaSnapshot: GeoPersonaSnapshot | null;
  turn: number;
  engine: string;
  prompt: string;
  answer: string;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  excerpt: string;
  sources: GeoCheckSourceItem[];
  grounding: GeoCheckGrounding;
  finishReason: string | null;
  promptTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  truncated: boolean | null;
  lastCheckedAt: Date;
}

export interface GeoCheckPersonaScanRow {
  scanId: string;
  capturedAt: Date;
}
