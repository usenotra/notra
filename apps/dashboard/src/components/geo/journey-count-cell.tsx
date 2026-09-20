import { GEO_TRAFFIC_STAT_TREND_HINT } from "@notra/geo-core/constants/geo";
import { trafficVisitDelta } from "@notra/geo-core/utils/ai-traffic";

import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import type { JourneyCountCellProps } from "@/types/geo";

/** Journey count with its change vs the previous window. */
export function JourneyCountCell({
  label,
  journeys,
  previousJourneys,
}: JourneyCountCellProps) {
  return (
    <span className="flex items-center justify-end gap-2">
      <GeoStatDelta
        delta={trafficVisitDelta(journeys, previousJourneys)}
        hint={GEO_TRAFFIC_STAT_TREND_HINT}
        label={label}
      />
      <span className="min-w-8 text-right text-sm tabular-nums">
        {journeys.toLocaleString()}
      </span>
    </span>
  );
}
