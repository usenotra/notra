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

/**
 * Stable ids for log rows. The log has no event id, so the id is built from
 * every field of the row. Rows that still match are identical requests; they
 * are told apart by their order counted from the oldest row: a request
 * arriving on top never shifts the ids below it, which keeps rows mounted
 * and lets only the new ones animate in.
 */
export function citationRowIds(
  entries: readonly GeoTrafficLogEntry[]
): Map<GeoTrafficLogEntry, string> {
  const ids = new Map<GeoTrafficLogEntry, string>();
  const seen = new Map<string, number>();
  for (const entry of [...entries].reverse()) {
    const base = [
      entry.capturedAt,
      entry.visitorType,
      entry.source,
      entry.agent,
      entry.category,
      entry.confidence,
      entry.host,
      entry.path,
      entry.country,
      entry.ua,
      entry.journeyId,
      entry.wantsMarkdown,
    ].join("-");
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    ids.set(entry, `${base}-${occurrence}`);
  }
  return ids;
}

/**
 * Rows of `next` that `previous` did not have. A result that shares no rows
 * with the previous one (first load, another project) counts as no arrivals,
 * so only genuinely new requests animate.
 */
export function arrivedCitationRowIds(
  previous: ReadonlySet<string>,
  next: Iterable<string>
): Set<string> {
  const arrived = new Set<string>();
  let kept = 0;
  for (const id of next) {
    if (previous.has(id)) {
      kept += 1;
    } else {
      arrived.add(id);
    }
  }
  return kept === 0 ? new Set() : arrived;
}
