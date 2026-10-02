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

export function formatCitationTimestamp(value: string, locale: string): string {
  const date = parseClickHouseDateTime(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(date);
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
 * Stable ids for log rows. The log has no event id, so identical requests
 * (same second, source and page) are told apart by their order counted from
 * the oldest row: a request arriving on top never shifts the ids below it,
 * which keeps rows mounted and lets only the new ones animate in.
 */
export function citationRowIds(
  entries: readonly GeoTrafficLogEntry[]
): Map<GeoTrafficLogEntry, string> {
  const ids = new Map<GeoTrafficLogEntry, string>();
  const seen = new Map<string, number>();
  for (const entry of [...entries].reverse()) {
    const base = `${entry.capturedAt}-${entry.source}-${entry.host}-${entry.path}-${entry.journeyId}`;
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    ids.set(entry, `${base}-${occurrence}`);
  }
  return ids;
}

/**
 * Rows of `next` that `previous` did not have. A fresh result set (filters,
 * host or project changed) shares no rows with the old one and counts as no
 * arrivals, so only genuinely new requests animate.
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
