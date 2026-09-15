import type { GEO_PERSONA_MEMORY_KINDS } from "../constants/geo-personas";

export type GeoPersonaMemoryKind = (typeof GEO_PERSONA_MEMORY_KINDS)[number];

export interface GeoPersonaProfile {
  goals: string[];
  painPoints: string[];
  currentStack: string[];
  buyingTriggers: string[];
  objections: string[];
}

interface GeoPersonaSnapshotContext {
  /** SHA-256 of the complete persona context. */
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
}

/** Historical snapshot created by the runtime persona agent. */
export interface GeoPersonaSnapshotV1 extends GeoPersonaSnapshotContext {
  schemaVersion: 1;
  model: string;
  promptVersion: number;
  systemPrompt: string;
  engineLabel: string;
  maxTurns: number;
}

/** Immutable fixed prompts and persona context stored with scan answers. */
export interface GeoPersonaSnapshotV2 extends GeoPersonaSnapshotContext {
  schemaVersion: 2;
  conversationPrompts: string[];
}

export type GeoPersonaSnapshot = GeoPersonaSnapshotV1 | GeoPersonaSnapshotV2;
