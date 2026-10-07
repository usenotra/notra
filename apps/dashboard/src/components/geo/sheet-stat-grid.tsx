"use client";

import { GEO_TRAFFIC_STAT_TREND_HINT } from "@notra/geo-core/constants/geo";

import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import type { SheetStatGridProps } from "@/types/geo";

/**
 * The three-up stat header every GEO detail sheet opens with. Sheets that have
 * no comparison period leave `delta` off entirely; `null` means the period
 * exists but has nothing to compare against, so the pill stays hidden.
 */
export function SheetStatGrid({ stats }: SheetStatGridProps) {
  return (
    <div className="bg-muted/30 @container/stats rounded-xl border p-4">
      <dl className="grid grid-cols-1 gap-4 @min-[20rem]/stats:grid-cols-3">
        {stats.map((stat) => (
          <div className="flex min-w-0 flex-col gap-1.5" key={stat.label}>
            <dt className="text-muted-foreground truncate text-xs">
              {stat.label}
            </dt>
            <dd className="m-0 flex min-w-0 items-center gap-2">
              <span className="truncate text-xl leading-none font-semibold tracking-tight tabular-nums">
                {stat.value}
              </span>
              {stat.delta === undefined ? null : (
                <GeoStatDelta
                  delta={stat.delta}
                  hint={GEO_TRAFFIC_STAT_TREND_HINT}
                  label={stat.label}
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
