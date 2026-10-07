"use client";

import {
  GEO_SPARKLINE_MIN_POINTS,
  GEO_TRAFFIC_STAT_TREND_HINT,
} from "@notra/geo-core/constants/geo";

import { DailyTrendChart } from "@/components/geo/daily-trend-chart";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import {
  TRAFFIC_HERO_CHART_SURFACE_CLASS,
  TRAFFIC_HERO_FRAME_CLASS,
  TRAFFIC_HERO_METRICS_STANDALONE_CLASS,
  TRAFFIC_HERO_METRICS_SURFACE_CLASS,
} from "@/constants/geo-traffic-hero";
import { cn } from "@/lib/utils";
import type { TrafficSheetHeroProps } from "@/types/geo";

/**
 * The AI traffic page's hero at drawer size: a metric strip on the shell with
 * the daily chart on the lifted card below it.
 */
export function TrafficSheetHero({
  stats,
  series,
  chartTitle,
  chartLabel,
}: TrafficSheetHeroProps) {
  const showTrend = series.length >= GEO_SPARKLINE_MIN_POINTS;

  return (
    <div className={TRAFFIC_HERO_FRAME_CLASS}>
      <dl
        className={cn(
          "grid grid-cols-3",
          showTrend
            ? TRAFFIC_HERO_METRICS_SURFACE_CLASS
            : TRAFFIC_HERO_METRICS_STANDALONE_CLASS
        )}
      >
        {stats.map((stat) => (
          <div
            className="border-border flex min-w-0 flex-col gap-2 overflow-hidden border-r px-3 py-4 last:border-r-0 @md/hero:px-5"
            key={stat.label}
          >
            <dt className="text-foreground/75 truncate text-sm leading-5 font-semibold tracking-tight">
              {stat.label}
            </dt>
            <dd className="m-0 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <span className="min-w-0 text-2xl leading-none font-semibold tracking-tight tabular-nums">
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
      {showTrend ? (
        <div className={TRAFFIC_HERO_CHART_SURFACE_CLASS}>
          <h3 className="mb-3 text-sm font-medium">{chartTitle}</h3>
          <DailyTrendChart label={chartLabel} points={series} />
        </div>
      ) : null}
    </div>
  );
}
