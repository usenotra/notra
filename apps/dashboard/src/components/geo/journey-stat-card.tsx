import { GEO_TRAFFIC_STAT_TREND_HINT } from "@notra/geo-core/constants/geo";

import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import {
  InstrumentEmpty,
  InstrumentModule,
} from "@/components/instrument/instrument-module";
import type { JourneyStatCardProps } from "@/types/geo";

/**
 * Shared frame for the two journey overview cards, so the headline, the stat
 * row and the preview table always line up side by side.
 */
export function JourneyStatCard({
  eyebrow,
  total,
  caption,
  delta,
  stats,
  emptyMessage,
  emptySeed,
  children,
}: JourneyStatCardProps) {
  return (
    <InstrumentModule className="h-full" eyebrow={eyebrow}>
      {total === 0 ? (
        <InstrumentEmpty
          className="h-full"
          message={emptyMessage}
          seed={emptySeed}
        />
      ) : (
        <div className="flex h-full flex-col gap-5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
              {total.toLocaleString()}
            </p>
            <p className="text-muted-foreground text-sm">{caption}</p>
            {delta === undefined ? null : (
              <GeoStatDelta
                className="self-center"
                delta={delta}
                hint={GEO_TRAFFIC_STAT_TREND_HINT}
                label={eyebrow}
              />
            )}
          </div>
          <dl className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div className="min-w-0" key={stat.label}>
                <dt className="text-muted-foreground truncate text-xs">
                  {stat.label}
                </dt>
                <dd className="text-foreground mt-0.5 truncate text-sm tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          {children}
        </div>
      )}
    </InstrumentModule>
  );
}
