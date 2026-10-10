import { HISTORY_WINDOW_MS } from "../constants/history.ts";
import type { HistorySnapshot } from "../types/history.ts";

/** UTC seconds or milliseconds in; real, canonical millisecond dates out. */
export function historyDate(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  ) {
    throw new Error("Invalid history date");
  }
  const canonical = value.includes(".") ? value : value.replace("Z", ".000Z");
  const milliseconds = Date.parse(canonical);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== canonical
  ) {
    throw new Error("Invalid history date");
  }
  return canonical;
}

/** End-only snapshot IDs are safe only for this fixed seven-day workflow. */
export function historySnapshot(start: unknown, end: unknown): HistorySnapshot {
  const snapshotStart = historyDate(start);
  const snapshotEnd = historyDate(end);
  if (
    Date.parse(snapshotEnd) - Date.parse(snapshotStart) !==
    HISTORY_WINDOW_MS
  ) {
    throw new Error("History snapshot must span exactly seven days");
  }
  return { snapshotStart, snapshotEnd };
}
