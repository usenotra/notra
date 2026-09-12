import type { GEO_PERSONA_MEMORY_KINDS } from "../constants/geo-personas";

export type GeoPersonaMemoryKind = (typeof GEO_PERSONA_MEMORY_KINDS)[number];

export interface GeoPersonaProfile {
  goals: string[];
  painPoints: string[];
  currentStack: string[];
  buyingTriggers: string[];
  objections: string[];
}

/** Immutable input context stored with persona scan answers. */
export interface GeoPersonaSnapshot {
  schemaVersion: 1;
  /** SHA-256 of the profile, memories, and generation configuration. */
  version: string;
  persona: {
    id: string;
    name: string;
    role: string;
    company: string;
    summary: string;
    searchStyle: string;
    profile: GeoPersonaProfile;
  };
  memories: { id: string; kind: GeoPersonaMemoryKind; content: string }[];
  model: string;
  promptVersion: number;
  systemPrompt: string;
  engineLabel: string;
  maxTurns: number;
}
