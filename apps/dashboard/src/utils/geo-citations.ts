import { parseClickHouseDateTime } from "@notra/analytics/utils/datetime";
import type { GeoTrafficLogEntry } from "@notra/geo-core/types/geo";
import {
  formatGeoAgent,
  formatGeoSource,
} from "@notra/geo-core/utils/ai-traffic";

export interface CitationProviderTooltip {
  title: string;
  raw: string | null;
}

export interface CitationTimestampParts {
  /** Time of day in the viewer's local time zone, e.g. "18:30:38". */
  time: string;
  /** Short date, only set when the request was not captured today. */
  date: string | null;
  /** Full date, time and zone name for the hover title. */
  full: string;
  iso: string;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatCitationTimestamp(
  value: string,
  locale: string,
  now: Date
): CitationTimestampParts | null {
  const date = parseClickHouseDateTime(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return {
    time: new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(date),
    date: isSameLocalDay(date, now)
      ? null
      : new Intl.DateTimeFormat(locale, {
          month: "short",
          day: "numeric",
          year: sameYear ? undefined : "numeric",
        }).format(date),
    full: new Intl.DateTimeFormat(locale, {
      dateStyle: "full",
      timeStyle: "long",
    }).format(date),
    iso: date.toISOString(),
  };
}

export function formatCitationProvider(agent: string, source: string): string {
  const trimmed = agent.trim();
  if (trimmed.length > 0) {
    return formatGeoAgent(trimmed);
  }
  return formatGeoSource(source);
}

export function citationProviderTooltip(
  entry: Pick<GeoTrafficLogEntry, "agent" | "source">
): CitationProviderTooltip {
  const title = formatCitationProvider(entry.agent, entry.source);
  const raw = (entry.agent || entry.source).trim();
  const showRaw = raw.length > 0 && raw.toLowerCase() !== title.toLowerCase();

  return {
    title,
    raw: showRaw ? raw : null,
  };
}

export function citationRowId(
  entry: GeoTrafficLogEntry,
  index: number
): string {
  return `${entry.capturedAt}-${entry.source}-${entry.host}-${entry.path}-${index}`;
}
