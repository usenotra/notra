import type { GeoCompetitorTimeseriesPoint } from "@notra/geo-core/types/geo";
import { formatDayLabel, todayIsoDate } from "@notra/geo-core/utils/day-label";

import type {
  GeoCompetitorDetailPoint,
  GeoCompetitorMentionStats,
} from "@/types/geo";

export function buildGeoCompetitorPoints(
  points: readonly GeoCompetitorTimeseriesPoint[]
): GeoCompetitorDetailPoint[] {
  const byDay = new Map(points.map((point) => [point.day, point.mentions]));
  return [...byDay.keys()].sort().map((day) => ({
    day: formatDayLabel(day),
    rawDay: day,
    mentions: byDay.get(day) ?? 0,
  }));
}

export function competitorChartHasIncompleteTail(
  points: readonly GeoCompetitorDetailPoint[],
  today = todayIsoDate()
): boolean {
  return points.at(-1)?.rawDay === today;
}

export function competitorMentionStats(
  points: readonly GeoCompetitorDetailPoint[]
): GeoCompetitorMentionStats | null {
  const latest = points.at(-1);
  if (!latest) {
    return null;
  }
  let peak = latest;
  for (const point of points) {
    if (point.mentions > peak.mentions) {
      peak = point;
    }
  }
  return {
    latest: latest.mentions,
    latestDay: latest.day,
    peak: peak.mentions,
  };
}
