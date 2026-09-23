import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { GeoBrandFact } from "@notra/db/types/geo-accuracy";
import type { LanguageModelUsage } from "ai";

import type { GeoContentBillingServiceShape } from "./deps";

export type { GeoBrandFact } from "@notra/db/types/geo-accuracy";
export type { GeoBrandFactCategory } from "@notra/db/types/geo-accuracy";

export type AccuracyVerdict = "accurate" | "inaccurate" | "unverifiable";

export interface AccuracyBilledGeneration {
  organizationId: string;
  billing: GeoContentBillingServiceShape;
  owns: () => Promise<boolean>;
  generate: () => Promise<AccuracyAgentResult>;
  modelId?: string;
  source?: string;
  logPrefix?: string;
}

export interface AccuracyAgentResult {
  output: unknown;
  usage: LanguageModelUsage;
  route?: AgentTokenUsage["route"];
}

export interface AccuracyAnalysisSample {
  id: string;
  answer: string;
  prompt: string;
  engine: string;
  capturedAt: string;
  sources: { url: string; title: string | null }[];
}

export interface AccuracyClaimEvidence {
  checkId: string;
  quote: string;
  prompt: string;
  engine: string;
  capturedAt: string;
  sources: { url: string; title: string | null }[];
}

export interface AccuracyClaimProbabilities {
  accurate: number;
  inaccurate: number;
  unverifiable: number;
}

export interface AccuracyClaim {
  statement: string;
  category: GeoBrandFact["category"];
  verdict: AccuracyVerdict;
  probabilities: AccuracyClaimProbabilities;
  evidence: AccuracyClaimEvidence[];
}

export interface AccuracyDailyPoint {
  day: string;
  score: number | null;
  accurate: number;
  inaccurate: number;
  unverifiable: number;
}

export interface AccuracyAnalysisResult {
  fingerprint: string;
  generatedAt: string;
  sampled: number;
  eligible: number;
  companyName: string;
  facts: GeoBrandFact[];
  score: number | null;
  accurate: number;
  inaccurate: number;
  unverifiable: number;
  insight: string;
  points: AccuracyDailyPoint[];
  claims: AccuracyClaim[];
}

export interface AccuracyAnalysisState {
  status: "ready" | "pending" | "stale" | "failed" | "unavailable";
  result: AccuracyAnalysisResult | null;
  facts: GeoBrandFact[];
  suggestedFact: string | null;
  companyName: string;
  message: string | null;
}

export interface AccuracyAnalysisStore {
  get: (key: string) => Promise<AccuracyAnalysisState | null>;
  locked: (key: string) => Promise<boolean>;
  renew: (key: string, token: string) => Promise<boolean>;
  claim: (key: string, token: string) => Promise<boolean>;
  commit: (
    key: string,
    resultKey: string,
    token: string,
    state: AccuracyAnalysisState,
    latestKey: string
  ) => Promise<boolean>;
}

export interface AccuracyAnalysisSnapshot {
  fingerprint: string;
  eligible: number;
}

export type AccuracyAnalysisDefer = (task: () => Promise<void>) => void;

export interface AccuracyAnalysisRun {
  key: string;
  store: AccuracyAnalysisStore;
  companyName: string;
  facts: GeoBrandFact[];
  suggestedFact: string | null;
  snapshot: () => Promise<AccuracyAnalysisSnapshot>;
  sample: () => Promise<AccuracyAnalysisSample[]>;
  extract: (
    sample: AccuracyAnalysisSample[],
    owns: () => Promise<boolean>
  ) => Promise<AccuracyClaim[]>;
  defer?: AccuracyAnalysisDefer;
}
