import { SQL } from "bun";

import { telemetryEvent } from "../../../packages/ai/src/utils/telemetry-event.ts";
import { HISTORY_WINDOW_MS } from "./constants/history.ts";
import { historyDate, historySnapshot } from "./schemas/history.ts";
import type { HistoryEvent, ScanHistoryRow } from "./types/history.ts";
import { pushHistory } from "./utils/push-history.ts";

// Run inside the existing production environment. Never copy its DB credential.
if (!process.env.DATABASE_URL) {
  throw new Error("Database is not configured");
}
const sql = new SQL(process.env.DATABASE_URL, {
  max: 1,
  connectionTimeout: 5,
  idleTimeout: 1,
});
try {
  const snapshotEnd = historyDate(process.env.HISTORY_END);
  if (Date.parse(snapshotEnd) > Date.now()) {
    throw new Error("Invalid history end");
  }
  const snapshot = historySnapshot(
    new Date(Date.parse(snapshotEnd) - HISTORY_WINDOW_MS).toISOString(),
    snapshotEnd
  );
  const { snapshotStart } = snapshot;
  const records = await sql.begin("READ ONLY", async (tx) => {
    await tx`SET LOCAL statement_timeout = '5s'`;
    await tx`SET LOCAL lock_timeout = '1s'`;
    await tx`SET LOCAL timezone = 'UTC'`;
    return tx<
      ScanHistoryRow[]
    >`SELECT id,organization_id,status,started_at,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens,reasoning_tokens,total_usd,duration_ms FROM geo_scans WHERE started_at >= ${snapshotStart}::timestamp AND started_at < ${snapshotEnd}::timestamp ORDER BY started_at LIMIT 2001`;
  });
  if (records.length > 2000) {
    throw new Error(
      "History row cap reached; a larger import requires a reviewed plan"
    );
  }
  const events = records.map<HistoryEvent>((row) => {
    const timestamp = new Date(row.started_at).toISOString();
    const projected = telemetryEvent({
      timestamp,
      level: "info",
      event: "history.geo.scan",
      service: "history-database",
      environment: "production",
      organizationId: row.organization_id,
      callId: `scan:${row.id}`,
      costId: `geo-scan:${row.id}`,
      outcome: row.status,
      weight: 1,
      costUsd: row.total_usd,
      durationMs: row.duration_ms ?? undefined,
      ai: {
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        cacheReadTokens: row.cache_read_tokens,
        cacheWriteTokens: row.cache_write_tokens,
        reasoningTokens: row.reasoning_tokens,
      },
    });
    if (!projected.callId || !projected.organizationId || !projected.outcome) {
      throw new Error("History attribution validation failed");
    }
    return {
      ...projected,
      timestamp,
      source: "database:geo_scans",
      ...snapshot,
    };
  });
  if (process.argv.includes("--apply")) {
    await pushHistory(
      events,
      `notra-history-database-${snapshotEnd.slice(0, 10).replaceAll("-", "")}`,
      snapshot
    );
  }
  console.log(
    JSON.stringify({
      readOnlySource: true,
      scans: events.length,
      costReports: events.filter((event) => event.costUsd !== undefined).length,
      reportedCostUsd: events.some((event) => typeof event.costUsd === "number")
        ? events.reduce(
            (sum, event) =>
              sum + (typeof event.costUsd === "number" ? event.costUsd : 0),
            0
          )
        : null,
      oldestAgeHours: events.length
        ? (Date.now() - Date.parse(String(events[0]?.timestamp))) / 3_600_000
        : null,
      applied: process.argv.includes("--apply"),
    })
  );
} catch {
  console.error(
    "History backfill failed; credentials and provider responses suppressed"
  );
  process.exitCode = 1;
} finally {
  await sql.close();
}
