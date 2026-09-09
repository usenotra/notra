import { db } from "@notra/db/drizzle";
import { geoScans } from "@notra/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { Effect } from "effect";

import type { GeoScanProjectContext, GeoScanPlannedTask } from "../types/geo";
import { geoScanAnswerKey } from "../utils/geo-scan-plan";
import { geoDb, geoSkip } from "./effect";

export const updateGeoScanTaskStatus = Effect.fn("geo.updateScanTaskStatus")(
  function* (
    context: Pick<
      GeoScanProjectContext,
      "organizationId" | "projectId" | "scanId"
    >,
    task: Pick<GeoScanPlannedTask, "prompt" | "engine" | "language">,
    status: "running" | "failed"
  ) {
    const key = geoScanAnswerKey(task.prompt.id, task.engine, task.language);
    yield* geoDb("scan task status update failed", () =>
      db
        .update(geoScans)
        .set({
          plan: sql`jsonb_set(${geoScans.plan}, '{taskStates}', coalesce(${geoScans.plan}->'taskStates', '{}'::jsonb) || jsonb_build_object(${key}::text, ${status}::text))`,
        })
        .where(
          and(
            eq(geoScans.id, context.scanId),
            eq(geoScans.organizationId, context.organizationId),
            eq(geoScans.projectId, context.projectId),
            eq(geoScans.status, "running")
          )
        )
    ).pipe(
      geoSkip("scan task status update failed", {
        organizationId: context.organizationId,
        projectId: context.projectId,
        scanId: context.scanId,
        promptId: task.prompt.id,
        engine: task.engine,
        language: task.language,
      })
    );
  }
);
