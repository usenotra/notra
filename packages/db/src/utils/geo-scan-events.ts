import { db } from "../drizzle";
import { geoScanEvents } from "../schema";
import type { GeoScanEventWrite } from "../types/geo-scan";

const ERROR_MESSAGE_MAX_LENGTH = 2000;

export async function insertGeoScanEvent(
  row: GeoScanEventWrite
): Promise<void> {
  await db.insert(geoScanEvents).values({
    id: row.id ?? crypto.randomUUID(),
    scanId: row.scanId,
    runId: row.runId,
    step: row.step,
    status: row.status,
    startedAt: row.startedAt,
    durationMs: row.durationMs,
    engine: row.engine ?? null,
    taskKey: row.taskKey ?? null,
    errorCode: row.errorCode ?? null,
    errorMessage: row.errorMessage
      ? row.errorMessage.slice(0, ERROR_MESSAGE_MAX_LENGTH)
      : null,
    usage: row.usage ?? null,
  });
}
