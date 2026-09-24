import { redis } from "@notra/ai/utils/redis";
import { db } from "@notra/db/drizzle";
import { projects } from "@notra/db/schema";
import {
  GEO_INGEST_IDENTITY_ACTIVE_TTL_SECONDS,
  GEO_INGEST_IDENTITY_CACHE_PREFIX,
  GEO_INGEST_IDENTITY_INACTIVE_TTL_SECONDS,
} from "@notra/geo-core/constants/geo";
import { getGeoIngestTokenGeneration } from "@notra/geo-core/geo/ingest";
import type { GeoIngestIdentity } from "@notra/geo-core/types/geo";
import { and, eq } from "drizzle-orm";

function identityCacheKey(identity: GeoIngestIdentity): string {
  return `${GEO_INGEST_IDENTITY_CACHE_PREFIX}:${identity.organizationId}:${identity.projectId ?? "-"}`;
}

async function lookupProject(identity: GeoIngestIdentity): Promise<boolean> {
  if (!identity.projectId) {
    return true;
  }
  const project = await db.query.projects.findFirst({
    columns: { id: true },
    where: and(
      eq(projects.id, identity.projectId),
      eq(projects.organizationId, identity.organizationId)
    ),
  });
  return project !== undefined;
}

/**
 * A valid signature is not enough: the token's generation must match the
 * token's organization or project scope (rotation revokes older generations), and the
 * organization (and project, when the token is project-scoped) must still
 * exist so leaked tokens die with the resources they were minted for. Lookups
 * are cached briefly and fail open on infrastructure errors so an outage
 * never drops real traffic.
 */
export async function isGeoIngestIdentityActive(
  identity: GeoIngestIdentity
): Promise<boolean> {
  const key = identityCacheKey(identity);
  const client = redis;
  // Both reads are independent round trips; the generation still decides first.
  const cachedLookup = client
    ? client.get<string>(key).catch(() => null)
    : Promise.resolve(null);

  try {
    const generation = await getGeoIngestTokenGeneration(
      identity.organizationId,
      identity.projectId
    );
    if (generation === null || generation !== identity.generation) {
      return false;
    }
  } catch {
    return true;
  }

  const cached = await cachedLookup;
  if (cached === "1") {
    return true;
  }
  if (cached === "0") {
    return false;
  }

  let active: boolean;
  try {
    active = await lookupProject(identity);
  } catch {
    return true;
  }

  if (client) {
    await client
      .set(key, active ? "1" : "0", {
        ex: active
          ? GEO_INGEST_IDENTITY_ACTIVE_TTL_SECONDS
          : GEO_INGEST_IDENTITY_INACTIVE_TTL_SECONDS,
      })
      .catch(() => null);
  }
  return active;
}
