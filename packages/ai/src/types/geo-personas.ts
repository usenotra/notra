import type {
  GeoPersonaMemoryKind,
  GeoPersonaProfile,
} from "@notra/db/types/geo-personas";
import type { LanguageModelUsage } from "ai";

export interface PersonaMemoryRecord {
  id: string;
  personaId: string;
  projectId: string;
  kind: GeoPersonaMemoryKind;
  content: string;
}

export interface PersonaMemoryHit {
  id: string;
  kind: GeoPersonaMemoryKind | null;
  content: string;
  score: number;
}

export interface PersonaVectorMetadata {
  personaId: string;
  projectId: string;
  kind: GeoPersonaMemoryKind;
  [key: string]: string;
}

export interface PersonaMemoryToolConfig {
  personaId: string;
  memories: readonly PersonaMemoryRecord[];
}

export interface PersonaAgentPersona {
  id: string;
  name: string;
  role: string;
  company: string;
  summary: string;
  searchStyle: string;
  profile: GeoPersonaProfile;
}

export interface PersonaConversationTurn {
  question: string;
  answer: string;
}

export interface PersonaNextTurnInput {
  organizationId: string;
  persona: PersonaAgentPersona;
  memories: readonly PersonaMemoryRecord[];
  engineLabel: string;
  transcript: readonly PersonaConversationTurn[];
  turnIndex: number;
  maxTurns: number;
}

export interface PersonaNextTurnResult {
  /** Null when the persona has nothing left to ask. */
  message: string | null;
  usage: LanguageModelUsage;
}
