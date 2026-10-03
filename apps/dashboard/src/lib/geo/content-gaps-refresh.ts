import { db } from "@notra/db/drizzle";
import { geoContentGapSnapshots, geoSettings } from "@notra/db/schema";
import { refreshGeoContentGaps } from "@notra/geo-core/geo/gaps";
import { asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_CONTENT_GAP_REFRESH_BATCH_SIZE,
  GEO_CONTENT_GAP_REFRESH_INTERVAL_MS,
} from "@/constants/geo-content-gaps";

export async function refreshDueGeoContentGaps() {
  const cutoff = new Date(Date.now() - GEO_CONTENT_GAP_REFRESH_INTERVAL_MS);
  const projects = await db
    .select({
      organizationId: geoSettings.organizationId,
      projectId: geoSettings.projectId,
    })
    .from(geoSettings)
    .leftJoin(
      geoContentGapSnapshots,
      eq(geoContentGapSnapshots.projectId, geoSettings.projectId)
    )
    .where(
      or(
        isNull(geoContentGapSnapshots.projectId),
        lt(geoContentGapSnapshots.updatedAt, cutoff)
      )
    )
    // Prepare new projects first, then serve the oldest due snapshots first.
    // Shuffle new projects and snapshots with equal timestamps to avoid a fixed retry order.
    .orderBy(
      sql`case when ${geoContentGapSnapshots.projectId} is null then 0 else 1 end`,
      asc(geoContentGapSnapshots.updatedAt),
      sql`random()`
    )
    .limit(GEO_CONTENT_GAP_REFRESH_BATCH_SIZE);

  let refreshed = 0;
  let failed = 0;
  for (const project of projects) {
    try {
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- bound the cron's database work
      await Effect.runPromise(refreshGeoContentGaps(project));
      refreshed++;
    } catch (error) {
      failed++;
      console.error(
        `[GEO] Content gaps refresh failed for ${project.projectId}:`,
        error
      );
    }
  }
  return { refreshed, failed };
}
