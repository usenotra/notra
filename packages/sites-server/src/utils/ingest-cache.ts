import { invalidateIngestSiteCaches } from "@notra/geo-core/ingest/sites";

import type { Site } from "../types/sites";

// Best effort: the ingest site cache expires on its own, so a failed
// invalidation only delays the change instead of failing the caller.
export async function invalidateSiteIngestCaches(
  site: Pick<Site, "id" | "organizationId">
): Promise<void> {
  await invalidateIngestSiteCaches(site.id, site.organizationId).catch(
    () => undefined
  );
}
