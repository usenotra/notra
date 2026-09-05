export interface GeoCheckScope {
  organizationId: string;
  projectId: string | null;
}

export interface GeoCheckFilterOptions {
  sequences?: "single";
  englishOnly?: boolean;
}

export interface GeoCheckSourceItem {
  url: string;
  title: string | null;
}

export interface GeoCheckSource {
  title: string;
  url: string;
  domain: string;
}

export interface GeoCheckGrounding {
  queries: string[];
  sources: GeoCheckSource[];
}

export interface GeoCheckWrite {
  id?: string;
  organizationId: string;
  projectId: string;
  scanId: string;
  engine: string;
  promptId: string;
  sequenceId?: string | null;
  personaId?: string | null;
  turn?: number;
  prompt: string;
  answer: string;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  competitors: string[];
  excerpt: string;
  grounding: GeoCheckGrounding;
  language: string;
  sources?: GeoCheckSourceItem[];
  finishReason: string | null;
  promptTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  zdrEnforced?: boolean | null;
  capturedAt: Date;
}

export interface GeoCheckOverviewRow {
  engine: string;
  checks: number;
  mentions: number;
  mentionRate: number;
  avgPosition: number | null;
  lastCheckedAt: Date;
}

export interface GeoCheckTimeseriesRow {
  day: string;
  engine: string;
  checks: number;
  mentions: number;
  avgPosition: number | null;
}

export interface GeoCheckPromptResultRow {
  promptId: string;
  engine: string;
  prompt: string;
  answer: string;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  competitors: string[];
  excerpt: string;
  grounding: GeoCheckGrounding;
  sources: GeoCheckSourceItem[];
  finishReason: string | null;
  promptTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  truncated: boolean | null;
  lastCheckedAt: Date;
}

export interface GeoCheckPromptHistoryQuery {
  promptIds: string[];
  limit: number;
}

export interface GeoCheckPromptHistoryRow {
  id: string;
  scanId: string;
  engine: string;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  competitors: string[];
  answer: string;
  excerpt: string;
  grounding: GeoCheckGrounding;
  sources: GeoCheckSourceItem[];
  language: string;
  capturedAt: Date;
}

export interface GeoCheckCompetitorShareRow {
  brand: string;
  mentions: number;
}

export interface GeoCheckCompetitorShareTimeseriesRow {
  brand: string;
  day: string;
  mentions: number;
}

export interface GeoCheckCompetitorShareTrendRow {
  day: string;
  brand: string;
  share: number;
}

export interface GeoCheckCompetitorTimeseriesRow {
  day: string;
  mentions: number;
  checks: number;
}

export interface GeoCheckCompetitorPromptRow {
  promptId: string;
  engine: string;
  prompt: string;
  mentioned: boolean;
  position: number | null;
  capturedAt: Date;
}

export interface GeoCheckLanguageShareRow {
  language: string;
  checks: number;
  mentions: number;
  mentionRate: number;
  avgPosition: number | null;
  lastCheckedAt: Date;
}

export interface GeoCheckLanguageShareTrendRow {
  day: string;
  language: string;
  mentionRate: number;
}

export interface GeoCheckWindow {
  from?: Date;
  toExclusive?: Date;
}

export interface GeoCheckWindowInput {
  days?: number;
  from?: string;
  to?: string;
}

export interface GeoCheckSequenceResultRow {
  sequenceId: string;
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

export interface GeoCheckPersonaResultRow {
  personaId: string;
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

export interface GeoCheckScanRow {
  id: string;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface GeoCheckScanComparisonRow {
  scanId: string;
  engine: string;
  promptId: string;
  prompt: string;
  mentioned: boolean;
  position: number | null;
  competitors: string[];
  grounding: GeoCheckGrounding;
  capturedAt: Date;
}

export interface GeoCheckScanComparison {
  previousScan: GeoCheckScanRow | null;
  currentScan: GeoCheckScanRow | null;
  previous: GeoCheckScanComparisonRow[];
  current: GeoCheckScanComparisonRow[];
}
