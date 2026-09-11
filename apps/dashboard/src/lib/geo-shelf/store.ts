import { db } from "@notra/db/drizzle";
import { geoShelfSources } from "@notra/db/schema";
import { geoShelfSourceSchema } from "@notra/schemas/dashboard/geo-shelf";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { GEO_SHELF_CITATION_INSERT_CHUNK } from "@/constants/geo-shelf";

import type {
  GeoShelfCitationSummary,
  GeoShelfSource,
  GeoShelfStoreKey,
} from "../../types/geo-shelf";

type GeoShelfSourceRow = typeof geoShelfSources.$inferSelect;

function toSource(row: GeoShelfSourceRow): GeoShelfSource {
  return geoShelfSourceSchema.parse({
    id: row.id,
    url: row.url,
    domain: row.domain,
    title: row.title,
    kind: row.kind,
    ownership: row.ownership,
    origin: row.origin,
    fetchStatus: row.fetchStatus,
    lastFetchedAt: row.lastFetchedAt?.toISOString() ?? null,
    citations: row.citations,
    placements: row.placements,
    opportunity: row.opportunity,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function toRow(source: GeoShelfSource, key: GeoShelfStoreKey) {
  return {
    id: source.id,
    organizationId: key.organizationId,
    projectId: key.projectId,
    url: source.url,
    domain: source.domain,
    title: source.title,
    kind: source.kind,
    ownership: source.ownership,
    origin: source.origin,
    fetchStatus: source.fetchStatus,
    lastFetchedAt: source.lastFetchedAt ? new Date(source.lastFetchedAt) : null,
    citations: source.citations,
    placements: source.placements,
    opportunity: source.opportunity,
    createdByUserId: source.createdByUserId,
    createdAt: new Date(source.createdAt),
    updatedAt: new Date(source.updatedAt),
  };
}

function scopeWhere(key: GeoShelfStoreKey) {
  return and(
    eq(geoShelfSources.organizationId, key.organizationId),
    eq(geoShelfSources.projectId, key.projectId)
  );
}

export async function listPersistedGeoShelfSources(
  key: GeoShelfStoreKey
): Promise<GeoShelfSource[]> {
  const rows = await db
    .select()
    .from(geoShelfSources)
    .where(scopeWhere(key))
    .orderBy(desc(geoShelfSources.updatedAt));
  return rows.map(toSource);
}

export async function findGeoShelfSourceByUrl(
  key: GeoShelfStoreKey,
  seed: () => GeoShelfSource[],
  url: string
): Promise<GeoShelfSource | null> {
  const [row] = await db
    .select()
    .from(geoShelfSources)
    .where(and(scopeWhere(key), eq(geoShelfSources.url, url)))
    .limit(1);
  if (row) {
    return toSource(row);
  }
  return seed().find((candidate) => candidate.url === url) ?? null;
}

export async function insertGeoShelfSource(
  key: GeoShelfStoreKey,
  source: GeoShelfSource
): Promise<GeoShelfSource> {
  const [inserted] = await db
    .insert(geoShelfSources)
    .values(toRow(source, key))
    .returning();
  if (!inserted) {
    throw new Error("Failed to persist GEO shelf source");
  }
  return toSource(inserted);
}

export async function insertGeoShelfSources(
  key: GeoShelfStoreKey,
  sources: GeoShelfSource[]
): Promise<GeoShelfSource[]> {
  if (sources.length === 0) {
    return [];
  }
  const persisted: GeoShelfSource[] = [];
  for (
    let index = 0;
    index < sources.length;
    index += GEO_SHELF_CITATION_INSERT_CHUNK
  ) {
    const chunk = sources.slice(index, index + GEO_SHELF_CITATION_INSERT_CHUNK);
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential chunks bound database concurrency
    await db
      .insert(geoShelfSources)
      .values(chunk.map((source) => toRow(source, key)))
      .onConflictDoNothing({
        target: [geoShelfSources.projectId, geoShelfSources.url],
      });
    const rows = await db
      .select()
      .from(geoShelfSources)
      .where(
        and(
          scopeWhere(key),
          inArray(
            geoShelfSources.url,
            chunk.map((source) => source.url)
          )
        )
      );
    persisted.push(...rows.map(toSource));
  }
  return persisted;
}

export async function updateGeoShelfCitations(
  key: GeoShelfStoreKey,
  updates: {
    id: string;
    citations: GeoShelfCitationSummary;
    title: string | null;
  }[]
): Promise<void> {
  if (updates.length === 0) {
    return;
  }
  await db.transaction(async (tx) => {
    for (const update of updates) {
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- one transaction connection executes queries serially
      await tx
        .update(geoShelfSources)
        .set({
          citations: update.citations,
          title: sql`coalesce(${geoShelfSources.title}, ${update.title})`,
        })
        .where(and(scopeWhere(key), eq(geoShelfSources.id, update.id)));
    }
  });
}

export async function patchGeoShelfSource(
  key: GeoShelfStoreKey,
  seed: () => GeoShelfSource[],
  sourceId: string,
  update: (current: GeoShelfSource) => GeoShelfSource
): Promise<GeoShelfSource | null> {
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(geoShelfSources)
      .where(and(scopeWhere(key), eq(geoShelfSources.id, sourceId)))
      .limit(1)
      .for("update");
    const current = row
      ? toSource(row)
      : (seed().find((candidate) => candidate.id === sourceId) ?? null);
    if (!current) {
      return null;
    }

    const next = geoShelfSourceSchema.parse(update(current));
    if (!row) {
      const [inserted] = await tx
        .insert(geoShelfSources)
        .values(toRow(next, key))
        .returning();
      return inserted ? toSource(inserted) : null;
    }

    const [updated] = await tx
      .update(geoShelfSources)
      .set(toRow(next, key))
      .where(and(scopeWhere(key), eq(geoShelfSources.id, sourceId)))
      .returning();
    return updated ? toSource(updated) : null;
  });
}
