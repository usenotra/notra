import { redis } from "@notra/ai/utils/redis";
import { db } from "@notra/db/drizzle";
import { projects } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

import { GEO_INGEST_HOSTS_CACHE_PREFIX } from "../constants/geo";

export function geoIngestHostsCacheKey(
  organizationId: string,
  projectId: string | null
): string {
  return `${GEO_INGEST_HOSTS_CACHE_PREFIX}:${organizationId}:${projectId ?? "-"}`;
}

/**
 * Drop the cached allowlist after settings or project identity change so a
 * newly linked brand is accepted immediately. Org-scoped tokens union every
 * project, so that key is cleared too.
 */
export async function invalidateGeoIngestHostsCache(
  organizationId: string,
  projectId: string | null
): Promise<void> {
  const client = redis;
  if (!client) {
    return;
  }
  const keys = [geoIngestHostsCacheKey(organizationId, projectId)];
  if (projectId) {
    keys.push(geoIngestHostsCacheKey(organizationId, null));
  }
  await Promise.all(keys.map((key) => client.del(key).catch(() => null)));
}

/**
 * Brand website changes affect every project linked to that voice, including
 * org-scoped tokens that union those hosts. Best-effort: a lookup blip must
 * not fail the settings write that already committed, and the org key is
 * still dropped so org-scoped tokens do not keep a stale union.
 */
export async function invalidateGeoIngestHostsCacheForBrand(
  organizationId: string,
  brandSettingsId: string
): Promise<void> {
  const client = redis;
  if (!client) {
    return;
  }
  const keys = [geoIngestHostsCacheKey(organizationId, null)];
  try {
    const rows = await db.query.projects.findMany({
      columns: { id: true },
      where: and(
        eq(projects.organizationId, organizationId),
        eq(projects.brandSettingsId, brandSettingsId)
      ),
    });
    for (const row of rows) {
      keys.push(geoIngestHostsCacheKey(organizationId, row.id));
    }
  } catch {
    // Org key still cleared below; project keys expire with the TTL.
  }
  await Promise.all(keys.map((key) => client.del(key).catch(() => null)));
}
