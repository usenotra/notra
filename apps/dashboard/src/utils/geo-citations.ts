import { parseClickHouseDateTime } from "@notra/analytics/utils/datetime";
import {
  AI_TRAFFIC_CONFIDENCE_LABELS,
  AI_TRAFFIC_PURPOSE_LABELS,
} from "@notra/geo-core/constants/geo";
import type { GeoTrafficLogEntry } from "@notra/geo-core/types/geo";
import { formatGeoSource } from "@notra/geo-core/utils/ai-traffic";

export interface CitationProviderTooltip {
  title: string;
  raw: string | null;
  purpose: string;
  confidence: string;
}

export function formatCitationTimestamp(value: string): string {
  const date = parseClickHouseDateTime(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${month}/${day}/${date.getUTCFullYear()} ${hours}:${minutes}:${seconds}`;
}

export function formatCitationProvider(agent: string, source: string): string {
  const trimmed = agent.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  return formatGeoSource(source);
}

export function citationProviderTooltip(
  entry: Pick<
    GeoTrafficLogEntry,
    "agent" | "source" | "category" | "confidence"
  >
): CitationProviderTooltip {
  const title = formatCitationProvider(entry.agent, entry.source);
  const raw = (entry.agent || entry.source).trim();
  const showRaw = raw.length > 0 && raw.toLowerCase() !== title.toLowerCase();

  return {
    title,
    raw: showRaw ? raw : null,
    purpose: AI_TRAFFIC_PURPOSE_LABELS[entry.category] ?? entry.category,
    confidence:
      AI_TRAFFIC_CONFIDENCE_LABELS[entry.confidence] ?? entry.confidence,
  };
}

export function citationRowId(
  entry: GeoTrafficLogEntry,
  index: number
): string {
  return `${entry.capturedAt}-${entry.source}-${entry.host}-${entry.path}-${index}`;
}
