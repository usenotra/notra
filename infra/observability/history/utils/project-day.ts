import {
  HISTORY_DAY_MS,
  HISTORY_FIELDS,
  HISTORY_KINDS,
} from "../constants/history.ts";
import { historyDate, historySnapshot } from "../schemas/history.ts";
import type { HistoryEvent } from "../types/history.ts";

/** Aggregate-only import: raw Axiom records and arbitrary metadata are forbidden. */
export function projectDay(record: Record<string, unknown>): HistoryEvent {
  if (typeof record.kind !== "string" || !HISTORY_KINDS.has(record.kind)) {
    throw new Error("Invalid history kind");
  }
  const snapshot = historySnapshot(record.snapshotStart, record.snapshotEnd);
  const bucketStart = historyDate(record.bucketStart);
  const timestamp = historyDate(record.timestamp);
  const bucket = Date.parse(bucketStart);
  const end = Date.parse(snapshot.snapshotEnd);
  const start = Date.parse(snapshot.snapshotStart);
  if (
    bucket >= end ||
    bucket + HISTORY_DAY_MS <= start ||
    bucket % HISTORY_DAY_MS !== 0 ||
    Date.parse(timestamp) !== Math.min(bucket + HISTORY_DAY_MS - 1, end)
  ) {
    throw new Error("Invalid history bucket");
  }
  const result: HistoryEvent = {
    event: `history.${record.kind}.day`,
    callId: `axiom:${snapshot.snapshotEnd.replaceAll(/[-:.]/g, "")}:${record.kind}:${bucketStart.slice(0, 10)}`,
    source: record.kind === "ingest" ? "axiom:notra-geo-scan" : "axiom:ai-logs",
    timestamp,
    ...snapshot,
    bucketStart,
  };
  for (const field of HISTORY_FIELDS) {
    const value = record[field];
    if (value === undefined) {
      continue;
    }
    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < 0
    ) {
      throw new Error("Invalid history count");
    }
    result[field] = value;
  }
  if (result.calls === undefined) {
    throw new Error("Missing history count");
  }
  if (
    record.kind === "api" &&
    (result.errors === undefined ||
      Number(result.errors) > Number(result.calls))
  ) {
    throw new Error("Invalid status coverage");
  }
  return result;
}
