import { getGeoIngestTokenGeneration } from "@notra/geo-core/geo/ingest";
import type { GeoIngestIdentity } from "@notra/geo-core/types/geo";

/**
 * A valid signature is not enough: the token's generation must match the
 * token's organization or project scope (rotation revokes older generations), and the
 * organization (and project, when the token is project-scoped) must still
 * exist so leaked tokens die with the resources they were minted for. The
 * generation lookup also checks existence and project ownership. Checks fail
 * closed so a database outage cannot reauthorize a revoked token.
 */
export async function isGeoIngestIdentityActive(
  identity: GeoIngestIdentity
): Promise<boolean> {
  try {
    const generation = await getGeoIngestTokenGeneration(
      identity.organizationId,
      identity.projectId
    );
    return generation !== null && generation === identity.generation;
  } catch {
    return false;
  }
}
