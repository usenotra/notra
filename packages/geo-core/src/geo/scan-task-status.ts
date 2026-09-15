import { db } from "@notra/db/drizzle";
import { geoScans } from "@notra/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { Effect } from "effect";

import type { GeoScanProjectContext, GeoScanPlannedTask } from "../types/geo";
import { geoScanAnswerKey } from "../utils/geo-scan-plan";
import { geoDb, geoSkip } from "./effect";

/** Natural conversation endings remove unneeded future turns from the plan atomically. */
export const omitGeoScanTasks = Effect.fn("geo.omitScanTasks")(function* (
  context: Pick<
    GeoScanProjectContext,
    "organizationId" | "projectId" | "scanId"
  >,
  keys: string[]
) {
  if (keys.length === 0) {
    return;
  }
  const retained = sql`(select coalesce(jsonb_agg(task), '[]'::jsonb) from jsonb_array_elements(coalesce(${geoScans.plan}->'tasks', '[]'::jsonb)) task where not ((task->>'key') = any(${sql.param(keys)}::text[])))`;
  yield* geoDb("scan plan update failed", () =>
    db
      .update(geoScans)
      .set({
        plan: sql`jsonb_set(jsonb_set(${geoScans.plan}, '{tasks}', ${retained}), '{totalChecks}', to_jsonb(jsonb_array_length(${retained})))`,
      })
      .where(
        and(
          eq(geoScans.id, context.scanId),
          eq(geoScans.projectId, context.projectId),
          eq(geoScans.organizationId, context.organizationId),
          eq(geoScans.status, "running")
        )
      )
  );
});

export const updateGeoScanTaskStatus = Effect.fn("geo.updateScanTaskStatus")(
  function* (
    context: Pick<
      GeoScanProjectContext,
      "organizationId" | "projectId" | "scanId"
    >,
    task: Pick<GeoScanPlannedTask, "prompt" | "engine" | "language">,
    status: "running" | "failed",
    turn = 0
  ) {
    const key = geoScanAnswerKey(
      task.prompt.id,
      task.engine,
      task.language,
      turn
    );
    yield* geoDb("scan task status update failed", () =>
      db
        .update(geoScans)
        .set({
          plan: sql`jsonb_set(${geoScans.plan}, '{taskStates}', coalesce(${geoScans.plan}->'taskStates', '{}'::jsonb) || jsonb_build_object(${key}::text, ${status}::text))`,
          planSummary: sql`
            case
              when ${geoScans.planSummary} is null then null
              when ${geoScans.plan}->'taskStates'->>${key} is not distinct from ${status}::text
                then ${geoScans.planSummary}
              else jsonb_set(
                ${geoScans.planSummary},
                '{taskCounts}',
                coalesce((
                  select jsonb_agg(
                    case
                      when counts.item->>'engine' = ${task.engine}::text then
                        jsonb_set(
                          counts.item,
                          '{failedChecks}',
                          to_jsonb(greatest(
                            0,
                            coalesce((counts.item->>'failedChecks')::integer, 0) +
                              case
                                when ${geoScans.plan}->'taskStates'->>${key} = 'failed'
                                  and ${status}::text <> 'failed' then -1
                                when ${geoScans.plan}->'taskStates'->>${key} is distinct from 'failed'
                                  and ${status}::text = 'failed' then 1
                                else 0
                              end
                          ))
                        )
                      else counts.item
                    end
                    order by counts.ordinality
                  )
                  from jsonb_array_elements(
                    coalesce(${geoScans.planSummary}->'taskCounts', '[]'::jsonb)
                  ) with ordinality as counts(item, ordinality)
                ), '[]'::jsonb)
              )
            end
          `,
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
