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

export function citationRowId(
  entry: GeoTrafficLogEntry,
  index: number
): string {
  return `${entry.capturedAt}-${entry.source}-${entry.host}-${entry.path}-${index}`;
}
