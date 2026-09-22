import { GEO_SHELF_ROOT_URL_PATTERN_SOURCE } from "@notra/db/constants/geo-shelf";
import { db } from "@notra/db/drizzle";
import { geoShelfSources } from "@notra/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { Effect } from "effect";

import type { GeoScopeInput } from "../types/geo";
import { geoDb } from "./effect";
import { requireGeoProject } from "./projects";

export const loadGeoShelfSources = Effect.fn("geo.shelfSources")(function* (
  input: GeoScopeInput & { offset: number; limit: number }
) {
  const scope = yield* requireGeoProject(input);
  const rows = yield* geoDb("shelf sources query failed", () =>
    db
      .select()
      .from(geoShelfSources)
      .where(
        and(
          eq(geoShelfSources.organizationId, input.organizationId),
          eq(geoShelfSources.projectId, scope.projectId),
          // Homepages cited by scans are not shelf space; mirrors the dashboard store.
          sql`not (${geoShelfSources.origin} = 'scan' and ${geoShelfSources.url} ~ ${GEO_SHELF_ROOT_URL_PATTERN_SOURCE})`
        )
      )
      .orderBy(desc(geoShelfSources.updatedAt), geoShelfSources.id)
      .limit(input.limit + 1)
      .offset(input.offset)
  );
  const hasMore = rows.length > input.limit;

  return {
    sources: rows.slice(0, input.limit).map((row) => ({
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
    })),
    nextOffset: hasMore ? input.offset + input.limit : null,
  };
});
