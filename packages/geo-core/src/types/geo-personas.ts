import type { geoPersonaMemories, geoPersonas } from "@notra/db/schema";
import type {
  GeoPersonaMemoryKind,
  GeoPersonaProfile,
  GeoPersonaSnapshot,
} from "@notra/db/types/geo-personas";
import type { InferSelectModel } from "drizzle-orm";

import type { GeoAnswerSource } from "./geo";

export type GeoPersonaRow = InferSelectModel<typeof geoPersonas>;
export type GeoPersonaMemoryRow = InferSelectModel<typeof geoPersonaMemories>;

export interface PersonaGenerationContext {
  companyName: string;
  websiteUrl: string | null;
  companyDescription: string | null;
  audience: string | null;
  competitors: string[];
  pages: { url: string; title: string | null }[];
  prompts: string[];
}

export interface PersonaForScan {
  persona: GeoPersonaSnapshot["persona"];
  memories: GeoPersonaMemory[];
  conversationPrompts: string[];
}

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
  conversationPrompts: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
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
  details?: GeoPersonaEditableDetails;
}

export type GeoPersonaEditableDetails = Pick<
  GeoPersona,
  "name" | "role" | "company" | "summary" | "searchStyle" | "profile"
>;

export interface GeoPersonaActivityPoint {
  personaId: string;
  day: string;
  checks: number;
  mentions: number;
}

export interface GeoPersonaActivityResponse {
  points: GeoPersonaActivityPoint[];
  from: string;
  to: string;
}

export interface GeoPersonaTurnResult {
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
  searchQueries: string[];
  sources: GeoAnswerSource[];
  finishReason: string | null;
  promptTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  truncated: boolean | null;
  lastCheckedAt: string;
}

export interface GeoPersonaScanSummary {
  id: string;
  capturedAt: string;
}

export interface GeoPersonaResultsResponse {
  results: GeoPersonaTurnResult[];
  scans: GeoPersonaScanSummary[];
  selectedScanId: string | null;
}

export interface GeoPersonaRunResponse {
  checks: number;
  mentions: number;
  engines: string[];
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
  conversationPrompts: string[];
  memories: GeoGeneratedPersonaMemory[];
}

export interface GeoPersonaGeneration {
  personas: GeoGeneratedPersona[];
}
