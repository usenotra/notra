import { and, asc, eq, inArray } from "drizzle-orm";

import {
  GEO_CONTEXT_COMPETITOR_LIMIT,
  GEO_CONTEXT_COMPETITOR_LOOKBACK_DAYS,
  GEO_CONTEXT_COMPETITOR_SHARE_ROWS,
} from "../constants/geo-context-competitors";
import { db } from "../drizzle";
import { geoCompetitors } from "../schema";
import type {
  GeoContextCompetitorOptions,
  GeoContextCompetitorSelection,
} from "../types/geo-context-competitors";
import { queryGeoCheckCompetitorShare } from "./geo-checks";

const DAY_MS = 24 * 60 * 60 * 1000;

function brandKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * The tracked competitors worth putting in an LLM prompt. A project may track
 * hundreds; the prompt gets the ones AI engines actually recommend (most
 * mentions in recent scans), with `preferNames` ahead of them and tracking
 * order as the fallback before any scan has run. Token usage stays flat no
 * matter how many competitors are tracked.
 */
export async function selectGeoContextCompetitors(
  scope: { organizationId: string; projectId: string },
  options: GeoContextCompetitorOptions = {}
): Promise<GeoContextCompetitorSelection> {
  const limit = options.limit ?? GEO_CONTEXT_COMPETITOR_LIMIT;
  const rows = await db
    .select({
      id: geoCompetitors.id,
      name: geoCompetitors.name,
      domain: geoCompetitors.domain,
      kind: geoCompetitors.kind,
      synonyms: geoCompetitors.synonyms,
    })
    .from(geoCompetitors)
    .where(
      and(
        eq(geoCompetitors.organizationId, scope.organizationId),
        eq(geoCompetitors.projectId, scope.projectId),
        options.ids && options.ids.length > 0
          ? inArray(geoCompetitors.id, [...options.ids])
          : undefined
      )
    )
    .orderBy(asc(geoCompetitors.createdAt));

  const toContext = (row: (typeof rows)[number]) => ({
    id: row.id,
    name: row.name,
    domain: row.domain,
    kind: row.kind,
  });
  const preferred = new Set((options.preferNames ?? []).map(brandKey));
  if (rows.length <= limit && preferred.size === 0) {
    return { competitors: rows.map(toContext), total: rows.length };
  }

  const shareRows =
    rows.length > limit
      ? await queryGeoCheckCompetitorShare(
          scope,
          {
            from: new Date(
              Date.now() - GEO_CONTEXT_COMPETITOR_LOOKBACK_DAYS * DAY_MS
            ),
          },
          GEO_CONTEXT_COMPETITOR_SHARE_ROWS
        )
      : [];
  const mentionsByKey = new Map<string, number>();
  for (const row of shareRows) {
    const key = brandKey(row.brand);
    mentionsByKey.set(key, (mentionsByKey.get(key) ?? 0) + row.mentions);
  }

  const ranked = rows.map((row, order) => {
    const keys = [row.name, ...(row.synonyms ?? [])].map(brandKey);
    return {
      row,
      order,
      isPreferred: keys.some((key) => preferred.has(key)),
      mentions: keys.reduce(
        (sum, key) => sum + (mentionsByKey.get(key) ?? 0),
        0
      ),
    };
  });
  ranked.sort(
    (left, right) =>
      Number(right.isPreferred) - Number(left.isPreferred) ||
      right.mentions - left.mentions ||
      left.order - right.order
  );

  return {
    competitors: ranked.slice(0, limit).map((entry) => toContext(entry.row)),
    total: rows.length,
  };
}
