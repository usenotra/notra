import type { GEO_PERSONA_MEMORY_KINDS } from "../constants/geo-personas";

export type GeoPersonaMemoryKind = (typeof GEO_PERSONA_MEMORY_KINDS)[number];

export interface GeoPersonaProfile {
  goals: string[];
  painPoints: string[];
  currentStack: string[];
  buyingTriggers: string[];
  objections: string[];
}
