import { geoScans } from "@notra/db/schema";
import type { GeoScanPlanSummary } from "@notra/db/types/geo-scan";
import { sql } from "drizzle-orm";

export function geoScanPlanSummarySelection() {
  return sql<GeoScanPlanSummary | null>`
    case
      when ${geoScans.planSummary} is not null then ${geoScans.planSummary}
      when ${geoScans.plan} is null then null
      else jsonb_build_object(
        'plannedChecks', (${geoScans.plan}->>'totalChecks')::integer,
        'hasTasks', jsonb_typeof(${geoScans.plan}->'tasks') = 'array',
        'engines', case
          when jsonb_typeof(${geoScans.plan}->'engines') = 'array'
            then ${geoScans.plan}->'engines'
          else '[]'::jsonb
        end,
        'taskCounts', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'engine', plan_counts.engine,
              'plannedChecks', plan_counts.planned_checks,
              'failedChecks', plan_counts.failed_checks
            ) order by plan_counts.engine
          )
          from (
            select
              task.value->>'engine' as engine,
              count(*)::integer as planned_checks,
              count(*) filter (
                where ${geoScans.plan}->'taskStates'->>(task.value->>'key') = 'failed'
              )::integer as failed_checks
            from jsonb_array_elements(
              case
                when jsonb_typeof(${geoScans.plan}->'tasks') = 'array'
                  then ${geoScans.plan}->'tasks'
                else '[]'::jsonb
              end
            ) as task(value)
            group by task.value->>'engine'
          ) as plan_counts
        ), '[]'::jsonb)
      )
    end
  `.as("plan_summary");
}
