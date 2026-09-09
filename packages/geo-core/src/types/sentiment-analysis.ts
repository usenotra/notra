import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { LanguageModelUsage } from "ai";

import type { GeoContentBillingServiceShape } from "./deps";

export interface SentimentBilledGeneration {
  organizationId: string;
  billing: GeoContentBillingServiceShape;
  owns: () => Promise<boolean>;
  generate: () => Promise<SentimentAgentResult>;
}

export interface SentimentAgentResult {
  output: unknown;
  usage: LanguageModelUsage;
  route?: AgentTokenUsage["route"];
}

export interface SentimentAnalysisSample {
  id: string;
  sentiment: string | null;
  answer: string;
  prompt: string;
  engine: string;
  capturedAt: string;
}
export interface SentimentTheme {
  title: string;
  polarity: "positive" | "negative";
  evidence: {
    checkId: string;
    quote: string;
    prompt: string;
    engine: string;
    capturedAt: string;
  }[];
}
export interface SentimentAnalysisResult {
  fingerprint: string;
  generatedAt: string;
  sampled: number;
  eligible: number;
  themes: SentimentTheme[];
}
export interface SentimentAnalysisState {
  status: "ready" | "pending" | "stale" | "failed" | "unavailable";
  result: SentimentAnalysisResult | null;
  message: string | null;
}
export interface SentimentAnalysisStore {
  get: (key: string) => Promise<SentimentAnalysisState | null>;
  locked: (key: string) => Promise<boolean>;
  renew: (key: string, token: string) => Promise<boolean>;
  claim: (key: string, token: string) => Promise<boolean>;
  commit: (
    key: string,
    resultKey: string,
    token: string,
    state: SentimentAnalysisState
  ) => Promise<boolean>;
}
export interface SentimentAnalysisSnapshot {
  fingerprint: string;
  eligible: number;
}
export interface SentimentAnalysisRun {
  key: string;
  store: SentimentAnalysisStore;
  snapshot: () => Promise<SentimentAnalysisSnapshot>;
  sample: () => Promise<SentimentAnalysisSample[]>;
  extract: (
    sample: SentimentAnalysisSample[],
    owns: () => Promise<boolean>
  ) => Promise<unknown>;
}
