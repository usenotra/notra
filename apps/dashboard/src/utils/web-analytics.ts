import type {
  GeoTrafficPoint,
  WebAnalyticsPoint,
  WebAnalyticsResponse,
  WebAnalyticsSource,
} from "@notra/geo-core/types/geo";
import {
  formatGeoSource,
  trafficDayKey,
  trafficSparklineDays,
} from "@notra/geo-core/utils/ai-traffic";
import { formatDayLabel } from "@notra/geo-core/utils/day-label";
import { trafficLogHostFilter } from "@notra/geo-core/utils/geo-project-domains";

import {
  WEB_SOURCE_LABELS,
  WEB_TABLE_MIN_ROWS,
  WEB_TABLE_ROW_HEIGHT,
  WEB_TREND_AGENTS_KEY,
  WEB_TREND_PEOPLE_KEY,
} from "@/constants/web-analytics";
import type { WebTrendRow, WebTrendShare } from "@/types/geo";

export function buildWebTrendRows(
  webPoints: readonly WebAnalyticsPoint[],
  aiPoints: readonly GeoTrafficPoint[],
  locale: string,
  from?: string,
  to?: string
): WebTrendRow[] {
  const people = new Map<string, number>();
  for (const point of webPoints) {
    const day = trafficDayKey(point.day);
    people.set(day, (people.get(day) ?? 0) + point.views);
  }
  const agents = new Map<string, number>();
  for (const point of aiPoints) {
    if (point.visitorType !== "crawler") {
      continue;
    }
    const day = trafficDayKey(point.day);
    agents.set(day, (agents.get(day) ?? 0) + point.visits);
  }
  const days = trafficSparklineDays([...aiPoints, ...webPoints], from, to);
  return days.map((day) => ({
    day: formatDayLabel(day, locale),
    rawDay: day,
    [WEB_TREND_PEOPLE_KEY]: people.get(day) ?? 0,
    [WEB_TREND_AGENTS_KEY]: agents.get(day) ?? 0,
  }));
}

export function webTrendShare(
  rows: readonly WebTrendRow[]
): WebTrendShare | null {
  let people = 0;
  let agents = 0;
  for (const row of rows) {
    people += row[WEB_TREND_PEOPLE_KEY];
    agents += row[WEB_TREND_AGENTS_KEY];
  }
  const total = people + agents;
  if (total === 0) {
    return null;
  }
  const peopleShare = (people / total) * 100;
  return { people: peopleShare, agents: 100 - peopleShare };
}

export function formatWebShare(share: number): string {
  if (share > 0 && share < 1) {
    return "<1";
  }
  if (share > 99 && share < 100) {
    return ">99";
  }
  return String(Math.round(share));
}

export function webHostsForSelect(
  web: WebAnalyticsResponse | undefined
): string[] {
  const hosts = new Set<string>();
  for (const row of web?.hosts ?? []) {
    const host = trafficLogHostFilter(row.host);
    if (host.length > 0) {
      hosts.add(host);
    }
  }
  return [...hosts];
}

export function hasWebAnalytics(
  web: WebAnalyticsResponse | undefined
): boolean {
  return (web?.totals.views ?? 0) > 0;
}

export function webSourceName(
  source: WebAnalyticsSource,
  directLabel: string
): string {
  if (source.group === "direct") {
    return directLabel;
  }
  if (source.group === "ai") {
    return formatGeoSource(source.source);
  }
  return Object.hasOwn(WEB_SOURCE_LABELS, source.source)
    ? (WEB_SOURCE_LABELS[source.source] ?? source.source)
    : source.source;
}

export function webTableHeight(rowCount: number): number {
  return (Math.max(rowCount, WEB_TABLE_MIN_ROWS) + 1) * WEB_TABLE_ROW_HEIGHT;
}

/** Visible time as "42s" or "3m 05s". */
export function formatVisibleDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  if (rounded < 60) {
    return `${rounded}s`;
  }
  const minutes = Math.floor(rounded / 60);
  const rest = String(rounded % 60).padStart(2, "0");
  return `${minutes}m ${rest}s`;
}
