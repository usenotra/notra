import type { GeoPersonaMemoryKind, GeoPersonaProfile } from "./geo-personas";

export interface SeedPersonaVisibilityPersona {
  id: string;
  name: string;
  role: string;
  company: string;
  summary: string;
  searchStyle: string;
  profile: GeoPersonaProfile;
  memories: {
    id: string;
    kind: GeoPersonaMemoryKind;
    content: string;
  }[];
  baseRate: number;
  trend: number;
}
