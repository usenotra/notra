import { redis } from "@notra/ai/utils/redis";
import { db } from "@notra/db/drizzle";
import { brandSettings, geoSettings, projects } from "@notra/db/schema";
import { GEO_INGEST_IDENTITY_ACTIVE_TTL_SECONDS } from "@notra/geo-core/constants/geo";
import { GEO_PROJECTS_OLDEST_ORDER } from "@notra/geo-core/constants/geo-projects";
import { geoIngestHostsCacheKey } from "@notra/geo-core/geo/ingest";
import type { GeoIngestIdentity } from "@notra/geo-core/types/geo";
import { ingestAllowedHosts } from "@notra/geo-core/utils/geo-project-domains";
import { and, eq } from "drizzle-orm";

function parseCachedHosts(value: unknown): string[] | undefined {
  if (Array.isArray(value) && value.every((host) => typeof host === "string")) {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.every((host) => typeof host === "string")
    ) {
      return parsed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function lookupAllowedHosts(
  identity: GeoIngestIdentity
): Promise<string[]> {
  // Legacy organization tokens belong to the oldest project only. Never
  // accept another project's host and attribute its traffic to the oldest.
  const projectId =
    identity.projectId ??
    (
      await db.query.projects.findFirst({
        columns: { id: true },
        where: eq(projects.organizationId, identity.organizationId),
        orderBy: GEO_PROJECTS_OLDEST_ORDER,
      })
    )?.id;
  if (!projectId) {
    return [];
  }

  const rows = await db
    .select({
      websiteUrl: brandSettings.websiteUrl,
      domains: geoSettings.domains,
    })
    .from(projects)
    .innerJoin(brandSettings, eq(projects.brandSettingsId, brandSettings.id))
    .leftJoin(geoSettings, eq(geoSettings.projectId, projects.id))
    .where(
      and(
        eq(projects.organizationId, identity.organizationId),
        eq(projects.id, projectId)
      )
    );

  const seen = new Set<string>();
  const hosts: string[] = [];
  for (const row of rows) {
    for (const host of ingestAllowedHosts(row.websiteUrl, row.domains ?? [])) {
      if (seen.has(host)) {
        continue;
      }
      seen.add(host);
      hosts.push(host);
    }
  }
  return hosts;
}

/**
 * Brand website plus extra tracked domains for this token. `null` means the
 * lookup failed and ingest should fail open; an empty array is a successful
 * lookup with nothing configured and every host is dropped.
 */
export async function loadIngestAllowedHosts(
  identity: GeoIngestIdentity
): Promise<string[] | null> {
  const key = geoIngestHostsCacheKey(
    identity.organizationId,
    identity.projectId
  );
  const client = redis;
  if (client) {
    const cached = await client.get<string | string[]>(key).catch(() => null);
    const parsed = parseCachedHosts(cached);
    if (parsed) {
      return parsed;
    }
  }

  let hosts: string[];
  try {
    hosts = await lookupAllowedHosts(identity);
  } catch {
    return null;
  }

  if (client) {
    await client
      .set(key, JSON.stringify(hosts), {
        ex: GEO_INGEST_IDENTITY_ACTIVE_TTL_SECONDS,
      })
      .catch(() => null);
  }
  return hosts;
}
