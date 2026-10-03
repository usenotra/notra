import {
  LIVE_TRAFFIC_MARKDOWN_PATHS,
  LIVE_TRAFFIC_PATHS,
  LIVE_TRAFFIC_PROVIDERS,
} from "@/constants/landing/live-traffic";
import type { CitationRow, LiveCitationRow } from "@/types/landing/geo";

const MS_PER_SECOND = 1000;
const PAD_LENGTH = 2;

function pick<T>(items: readonly T[]): T {
  const index = Math.floor(Math.random() * items.length);
  const item = items[index];
  if (item === undefined) {
    throw new Error("Cannot pick from an empty list");
  }
  return item;
}

function pad(value: number): string {
  return String(value).padStart(PAD_LENGTH, "0");
}

export function seedLiveRows(rows: CitationRow[]): LiveCitationRow[] {
  return rows.map((row) => ({
    ...row,
    offsetMs: -row.agoSeconds * MS_PER_SECOND,
  }));
}

export function randomLiveRow(offsetMs: number): LiveCitationRow {
  const source = pick(LIVE_TRAFFIC_PROVIDERS);
  const path = pick(LIVE_TRAFFIC_PATHS);
  return {
    id: `live-${offsetMs}-${Math.random().toString(36).slice(2, 8)}`,
    agoSeconds: 0,
    provider: source.provider,
    engine: source.engine,
    path,
    purpose: pick(source.purposes),
    markdown: LIVE_TRAFFIC_MARKDOWN_PATHS.has(path) ? true : undefined,
    offsetMs,
  };
}

export function formatCapturedAt(row: LiveCitationRow, base: number): string {
  const date = new Date(base + row.offsetMs);
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${month}/${day}/${date.getFullYear()} ${time}`;
}
