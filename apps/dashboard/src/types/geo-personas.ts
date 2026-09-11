import type { GeoPersonaEditableDetails } from "@notra/geo-core/types/geo-personas";

export interface GeoPersonaUpdateInput {
  personaId: string;
  enabled?: boolean;
  details?: GeoPersonaEditableDetails;
}
