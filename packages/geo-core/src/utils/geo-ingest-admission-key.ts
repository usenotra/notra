import type { GeoIngestIdentity } from "../types/geo";

export function geoIngestAdmissionKey(identity: GeoIngestIdentity): string {
  return JSON.stringify([
    identity.organizationId,
    identity.projectId,
    identity.generation,
  ]);
}
