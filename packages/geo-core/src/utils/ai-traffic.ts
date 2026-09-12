import { parseClickHouseDateTime } from "@notra/analytics/utils/datetime";

import {
  GEO_SOURCE_LABELS,
  GEO_JOURNEY_BROWSE_CATEGORY,
  GEO_JOURNEY_CHIP_LENGTH,
  GEO_JOURNEY_EXPLICIT_PREFIX,
  GEO_SPARKLINE_MIN_POINTS,
  GEO_SPARKLINE_FLAT_THRESHOLD,
  GEO_STAT_DELTA_NEW,
  GEO_TRAFFIC_TREND_CRAWLER_KEY,
  GEO_TRAFFIC_TREND_REFERRAL_KEY,
  GEO_UNTRACKED_VISITOR_TYPES,
} from "../constants/geo";
import type {
  GeoTrafficLogFilters,
  GeoTrafficLogPurposeFilter,
  GeoTrafficLogVisitorFilter,
  GeoTrafficPoint,
  GeoTrafficSource,
  GeoTrafficTotals,
  GeoTrafficTrendRow,
  GeoVisitorType,
  TrafficMetricDeltas,
} from "../types/geo";
import { formatDayLabel } from "./day-label";

const VISITOR_TYPES: readonly GeoVisitorType[] = [
  "crawler",
  "ai_referral",
  "human",
  "unknown",
];

export function toGeoVisitorType(value: string): GeoVisitorType {
  return VISITOR_TYPES.find((type) => type === value) ?? "unknown";
}

export function isTrackedGeoVisitorType(value: GeoVisitorType): boolean {
  return !GEO_UNTRACKED_VISITOR_TYPES.includes(value);
}

export function formatGeoSource(source: string): string {
  const trimmed = source.trim();
  return GEO_SOURCE_LABELS[trimmed.toLowerCase()] ?? trimmed;
}

export function isCitedTrafficSource(
  source: Pick<GeoTrafficSource, "visitorType" | "category">
): boolean {
  return (
    source.visitorType === "crawler" &&
    source.category === GEO_JOURNEY_BROWSE_CATEGORY
  );
}

export function toGeoTrafficTotals(
  sources: readonly GeoTrafficSource[],
  conversions: number | null = null
): GeoTrafficTotals {
  const totals: GeoTrafficTotals = {
    crawler: 0,
    cited: 0,
    aiReferral: 0,
    conversions,
  };
  for (const source of sources) {
    if (source.visitorType === "crawler") {
      totals.crawler += source.visits;
      if (source.category === GEO_JOURNEY_BROWSE_CATEGORY) {
        totals.cited += source.visits;
      }
    } else if (source.visitorType === "ai_referral") {
      totals.aiReferral += source.visits;
    }
  }
  return totals;
}

// Previous-window totals, mirroring toGeoTrafficTotals. Returns null when the
// endpoint sent no comparison data at all, so callers can hide their deltas
// instead of rendering an all-zero baseline as "+100%".
export function toGeoTrafficPreviousTotals(
  sources: readonly GeoTrafficSource[],
  previousConversions: number | null = null
): GeoTrafficTotals | null {
  const withPrevious = sources.filter(
    (source) => source.previousVisits !== undefined
  );
  if (withPrevious.length === 0) {
    return null;
  }
  return toGeoTrafficTotals(
    withPrevious.map((source) => ({
      ...source,
      visits: source.previousVisits ?? 0,
    })),
    previousConversions
  );
}

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatAiTrafficTimestamp(value: string): string {
  const date = parseClickHouseDateTime(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return timestampFormatter.format(date);
}

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export function formatGeoJourneyChip(journeyId: string): string {
  return journeyId.slice(-GEO_JOURNEY_CHIP_LENGTH);
}

export function toGeoJourneyKind(journeyId: string): "tagged" | "fingerprint" {
  return journeyId.startsWith(GEO_JOURNEY_EXPLICIT_PREFIX)
    ? "tagged"
    : "fingerprint";
}

export function formatGeoTrafficFilterLabel(
  base: string,
  noun: string,
  selected: readonly string[],
  options: readonly { value: string; label: string }[]
): string {
  const first = selected[0];
  if (first === undefined) {
    return base;
  }
  if (selected.length === 1) {
    return options.find((option) => option.value === first)?.label ?? first;
  }
  return `${noun} (${selected.length})`;
}

export function toggleGeoTrafficFilterValue<T extends string>(
  values: T[],
  value: T
): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function toGeoTrafficLogVisitorFilter(
  values: GeoTrafficLogFilters["visitorTypes"]
): GeoTrafficLogVisitorFilter[] | undefined {
  return values.length > 0 ? values : undefined;
}

export function toGeoTrafficLogPurposeFilter(
  values: GeoTrafficLogFilters["categories"]
): GeoTrafficLogPurposeFilter[] | undefined {
  return values.length > 0 ? values : undefined;
}

export function formatGeoJourneySpan(
  firstSeenAt: string,
  lastSeenAt: string
): string {
  const start = parseClickHouseDateTime(firstSeenAt);
  const end = parseClickHouseDateTime(lastSeenAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  const minutes = Math.max(
    Math.round((end.getTime() - start.getTime()) / MS_PER_MINUTE),
    0
  );
  if (minutes < 1) {
    return "under a minute";
  }
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) {
    return `${hours}h ${minutes % MINUTES_PER_HOUR}m`;
  }
  return `${Math.floor(hours / HOURS_PER_DAY)}d ${hours % HOURS_PER_DAY}h`;
}

export function formatMarkdownShare(markdown: number, visits: number): string {
  if (visits === 0) {
    return "-";
  }
  return `${Math.round((markdown / visits) * 100)}%`;
}

export function trafficDayKey(day: string): string {
  return String(day).slice(0, 10);
}

export function hasTrafficSourceSeries(
  points: readonly GeoTrafficPoint[]
): boolean {
  return points.some((point) => point.source.length > 0);
}

export function trafficSparklineDays(
  points: readonly GeoTrafficPoint[]
): string[] {
  return [...new Set(points.map((point) => trafficDayKey(point.day)))].sort();
}

export function buildTrafficTrendRows(
  points: readonly GeoTrafficPoint[]
): GeoTrafficTrendRow[] {
  const byDay = new Map<string, { crawler: number; aiReferral: number }>();

  for (const point of points) {
    if (
      point.visitorType !== "crawler" &&
      point.visitorType !== "ai_referral"
    ) {
      continue;
    }

    const day = trafficDayKey(point.day);
    const current = byDay.get(day) ?? { crawler: 0, aiReferral: 0 };
    if (point.visitorType === "crawler") {
      current.crawler += point.visits;
    } else {
      current.aiReferral += point.visits;
    }
    byDay.set(day, current);
  }

  return [...byDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([day, values]) => ({
      day: formatDayLabel(day),
      rawDay: day,
      [GEO_TRAFFIC_TREND_CRAWLER_KEY]: values.crawler,
      [GEO_TRAFFIC_TREND_REFERRAL_KEY]: values.aiReferral,
    }));
}

export function isTrafficPagePending({
  isSettingsPending,
  hasSettings,
  isTrafficPending,
  isEmptyTraffic,
  isIngestPending,
}: {
  isSettingsPending: boolean;
  hasSettings: boolean;
  isTrafficPending: boolean;
  isEmptyTraffic: boolean;
  isIngestPending: boolean;
}): boolean {
  if (isSettingsPending) {
    return true;
  }
  if (!hasSettings) {
    return false;
  }
  if (isTrafficPending) {
    return true;
  }
  return isEmptyTraffic && isIngestPending;
}

export function trafficVisitDelta(
  current: number,
  previous: number
): number | null {
  if (current === 0 && previous === 0) {
    return null;
  }
  if (previous === 0) {
    return current > 0 ? GEO_STAT_DELTA_NEW : null;
  }
  return ((current - previous) / previous) * 100;
}

export function isGeoStatDeltaNew(delta: number): boolean {
  return delta === GEO_STAT_DELTA_NEW;
}

export function isGeoTrafficCitationsOnly(
  categories: GeoTrafficLogFilters["categories"]
): boolean {
  return (
    categories.length === 1 && categories[0] === GEO_JOURNEY_BROWSE_CATEGORY
  );
}

export function toggleGeoTrafficCitationsOnly(
  categories: GeoTrafficLogFilters["categories"]
): GeoTrafficLogFilters["categories"] {
  return isGeoTrafficCitationsOnly(categories)
    ? []
    : [GEO_JOURNEY_BROWSE_CATEGORY];
}

export function formatGeoTrafficRequestCount(total: number): string {
  return `${total.toLocaleString()} ${total === 1 ? "request" : "requests"}`;
}

function sumTrafficTrendMetric(
  rows: readonly GeoTrafficTrendRow[],
  key:
    | typeof GEO_TRAFFIC_TREND_CRAWLER_KEY
    | typeof GEO_TRAFFIC_TREND_REFERRAL_KEY
): number {
  return rows.reduce((total, row) => total + row[key], 0);
}

export function trafficMetricDeltas(
  rows: readonly GeoTrafficTrendRow[]
): TrafficMetricDeltas {
  const empty: TrafficMetricDeltas = {
    crawler: null,
    aiReferral: null,
    total: null,
  };
  if (rows.length < GEO_SPARKLINE_MIN_POINTS) {
    return empty;
  }

  const mid = Math.floor(rows.length / 2);
  const previous = rows.slice(0, mid);
  const current = rows.slice(mid);
  const previousCrawler = sumTrafficTrendMetric(
    previous,
    GEO_TRAFFIC_TREND_CRAWLER_KEY
  );
  const currentCrawler = sumTrafficTrendMetric(
    current,
    GEO_TRAFFIC_TREND_CRAWLER_KEY
  );
  const previousReferral = sumTrafficTrendMetric(
    previous,
    GEO_TRAFFIC_TREND_REFERRAL_KEY
  );
  const currentReferral = sumTrafficTrendMetric(
    current,
    GEO_TRAFFIC_TREND_REFERRAL_KEY
  );

  return {
    crawler: trafficVisitDelta(currentCrawler, previousCrawler),
    aiReferral: trafficVisitDelta(currentReferral, previousReferral),
    total: trafficVisitDelta(
      currentCrawler + currentReferral,
      previousCrawler + previousReferral
    ),
  };
}

export function sparklineTrend(
  points: readonly { value: number }[]
): "up" | "down" | "flat" {
  const count = points.length;
  if (count < GEO_SPARKLINE_MIN_POINTS) {
    return "flat";
  }
  const meanX = (count - 1) / 2;
  let sum = 0;
  for (const point of points) {
    sum += point.value;
  }
  const meanY = sum / count;
  if (meanY === 0) {
    return "flat";
  }
  let covariance = 0;
  let variance = 0;
  for (const [index, point] of points.entries()) {
    const dx = index - meanX;
    covariance += dx * (point.value - meanY);
    variance += dx * dx;
  }
  const slope = variance === 0 ? 0 : covariance / variance;
  const changeOverWindow = slope * (count - 1);
  const relativeChange = changeOverWindow / meanY;
  if (relativeChange > GEO_SPARKLINE_FLAT_THRESHOLD) {
    return "up";
  }
  if (relativeChange < -GEO_SPARKLINE_FLAT_THRESHOLD) {
    return "down";
  }
  return "flat";
}
