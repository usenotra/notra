import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { geoPersonaMemories, geoPersonas } from "@notra/db/schema";
import type { GeoCheckWrite } from "@notra/db/types/geo-checks";
import type {
  GeoPersonaMemoryKind,
  GeoPersonaProfile,
} from "@notra/db/types/geo-personas";
import type { InferSelectModel } from "drizzle-orm";

import type { GeoAnswerSource } from "./geo";

export type GeoPersonaRow = InferSelectModel<typeof geoPersonas>;
export type GeoPersonaMemoryRow = InferSelectModel<typeof geoPersonaMemories>;

export interface GeoPersonaMemory {
  id: string;
  kind: GeoPersonaMemoryKind;
  content: string;
}

export interface GeoPersona {
  id: string;
  name: string;
  role: string;
  company: string;
  summary: string;
  searchStyle: string;
  profile: GeoPersonaProfile;
  enabled: boolean;
  createdAt: string;
  memories: GeoPersonaMemory[];
}

export interface GeoPersonasResponse {
  configured: boolean;
  personas: GeoPersona[];
}

export interface GeoPersonaGenerateResponse {
  personas: GeoPersona[];
}

export interface GeoPersonaUpdateInput {
  personaId: string;
  enabled?: boolean;
}

export interface GeoPersonaTurnResult {
  personaId: string;
  turn: number;
  engine: string;
  prompt: string;
  answer: string;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  excerpt: string;
  searchQueries: string[];
  sources: GeoAnswerSource[];
  finishReason: string | null;
  promptTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  truncated: boolean | null;
  lastCheckedAt: string;
}

export interface GeoPersonaResultsResponse {
  results: GeoPersonaTurnResult[];
}

export interface GeoPersonaRunResponse {
  checks: number;
  mentions: number;
  engines: string[];
}

export interface GeoPersonaCheckOutcome {
  rows: GeoCheckWrite[];
  usage: AgentTokenUsage;
  droppedTurns: number;
}

export interface GeoGeneratedPersonaMemory {
  kind: GeoPersonaMemoryKind;
  content: string;
}

export interface GeoGeneratedPersona {
  name: string;
  role: string;
  company: string;
  summary: string;
  searchStyle: string;
  goals: string[];
  painPoints: string[];
  currentStack: string[];
  buyingTriggers: string[];
  objections: string[];
  memories: GeoGeneratedPersonaMemory[];
}

export interface GeoPersonaGeneration {
  personas: GeoGeneratedPersona[];
}
