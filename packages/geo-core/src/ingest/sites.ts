import { redis } from "@notra/ai/utils/redis";
import { db } from "@notra/db/drizzle";
import { projects, sites } from "@notra/db/schema";
import {
  GEO_INGEST_IDENTITY_ACTIVE_TTL_SECONDS,
  GEO_INGEST_SITE_INACTIVE_TTL_SECONDS,
  GEO_INGEST_ORGANIZATION_SITES_CACHE_PREFIX,
  GEO_INGEST_SITE_CACHE_PREFIX,
  GEO_INGEST_SITE_MEMORY_MAX_ENTRIES,
  GEO_INGEST_SITE_MEMORY_TTL_MS,
} from "@notra/geo-core/constants/geo";
import { GEO_PROJECTS_OLDEST_ORDER } from "@notra/geo-core/constants/geo-projects";
import type {
  GeoIngestSite,
  GeoIngestSitePrefix,
} from "@notra/geo-core/types/geo";
import { urlHost } from "@notra/geo-core/utils/url-host";
import { listMountedAreas } from "@notra/sites-core/utils/mounts";
import { and, eq } from "drizzle-orm";

const memory = new Map<string, { site: GeoIngestSite | null; until: number }>();

export async function invalidateIngestSiteCaches(
  siteId: string,
  organizationId: string
): Promise<void> {
  memory.delete(siteId);
  const client = redis;
  if (client) {
    await client.del(
      `${GEO_INGEST_SITE_CACHE_PREFIX}:${siteId}`,
      `${GEO_INGEST_ORGANIZATION_SITES_CACHE_PREFIX}:${organizationId}`
    );
  }
}

async function cached<T>(
  key: string,
  load: () => Promise<T | null>
): Promise<T | null> {
  const client = redis;
  if (client) {
    const hit = await client.get<{ value: T | null }>(key).catch(() => null);
    if (hit && typeof hit === "object" && "value" in hit) {
      return hit.value;
    }
  }
  const value = await load();
  if (client) {
    await client
      .set(
        key,
        { value },
        {
          ex:
            value === null
              ? GEO_INGEST_SITE_INACTIVE_TTL_SECONDS
              : GEO_INGEST_IDENTITY_ACTIVE_TTL_SECONDS,
        }
      )
      .catch(() => null);
  }
  return value;
}

export async function loadIngestSite(
  siteId: string
): Promise<GeoIngestSite | null> {
  const now = Date.now();
  const hit = memory.get(siteId);
  if (hit && hit.until > now) {
    return hit.site;
  }
  const site = await lookupIngestSite(siteId);
  if (memory.size >= GEO_INGEST_SITE_MEMORY_MAX_ENTRIES) {
    memory.clear();
  }
  memory.set(siteId, { site, until: now + GEO_INGEST_SITE_MEMORY_TTL_MS });
  return site;
}

function lookupIngestSite(siteId: string): Promise<GeoIngestSite | null> {
  return cached(`${GEO_INGEST_SITE_CACHE_PREFIX}:${siteId}`, async () => {
    const site = await db.query.sites.findFirst({
      columns: {
        id: true,
        organizationId: true,
        projectId: true,
        publicOrigin: true,
        status: true,
      },
      where: eq(sites.id, siteId),
    });
    const host = site ? urlHost(site.publicOrigin) : null;
    if (!(site && host) || site.status !== "active") {
      return null;
    }
    const projectId =
      site.projectId ??
      (
        await db.query.projects.findFirst({
          columns: { id: true },
          where: eq(projects.organizationId, site.organizationId),
          orderBy: GEO_PROJECTS_OLDEST_ORDER,
        })
      )?.id;
    if (!projectId) {
      return null;
    }
    return {
      id: site.id,
      organizationId: site.organizationId,
      projectId,
      hosts: [host],
    };
  });
}

export async function loadOrganizationSitePrefixes(
  organizationId: string
): Promise<GeoIngestSitePrefix[] | null> {
  try {
    return await cached(
      `${GEO_INGEST_ORGANIZATION_SITES_CACHE_PREFIX}:${organizationId}`,
      async () => {
        const rows = await db
          .select({ publicOrigin: sites.publicOrigin, mounts: sites.mounts })
          .from(sites)
          .where(
            and(
              eq(sites.organizationId, organizationId),
              eq(sites.status, "active")
            )
          );
        const prefixes: GeoIngestSitePrefix[] = [];
        for (const row of rows) {
          const host = urlHost(row.publicOrigin);
          if (host) {
            prefixes.push({
              host,
              mounts: listMountedAreas(row.mounts).map(({ mount }) => mount),
            });
          }
        }
        return prefixes;
      }
    );
  } catch {
    return null;
  }
}
