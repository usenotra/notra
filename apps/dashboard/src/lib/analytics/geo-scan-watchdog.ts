import { db } from "@notra/db/drizzle";
import { geoScans, geoSettings } from "@notra/db/schema";
import { alertMissedGeoScan } from "@notra/geo-core/utils/geo-scan-alert";
import { and, asc, desc, eq, gte, lte, or } from "drizzle-orm";

import { GEO_SCAN_ALERTS } from "@/constants/workflow-monitoring";
import { logWorkflowTelemetry } from "@/utils/workflow-telemetry";

/** Runs independently of the GEO cron, including after a stale row was failed. */
export async function checkMissedGeoScans(): Promise<void> {
  const startedAt = Date.now();
  const [overdue, stale] = await Promise.all([
    db.query.geoSettings.findMany({
      columns: {
        organizationId: true,
        projectId: true,
        nextScanAt: true,
        lastScanAt: true,
        scanLeaseUntil: true,
      },
      where: and(
        eq(geoSettings.enabled, true),
        lte(geoSettings.nextScanAt, new Date(startedAt - 30 * 60_000))
      ),
      orderBy: [asc(geoSettings.nextScanAt)],
    }),
    db.query.geoScans.findMany({
      columns: {
        id: true,
        errorCode: true,
        organizationId: true,
        projectId: true,
        startedAt: true,
      },
      where: and(
        eq(geoScans.status, "failed"),
        or(
          eq(geoScans.errorCode, "scan_stale"),
          eq(geoScans.errorCode, "scan_retry_exhausted")
        ),
        gte(
          geoScans.finishedAt,
          new Date(startedAt - GEO_SCAN_ALERTS.staleLookbackSeconds * 1000)
        )
      ),
      orderBy: [desc(geoScans.finishedAt)],
    }),
  ]);

  if (overdue.length > 0) {
    logWorkflowTelemetry({
      event: "geo.scan.schedule.overdue",
      outcome: "error",
      count: overdue.length,
      projectIds: overdue.slice(0, 25).map((row) => row.projectId),
      oldestDueAt: overdue[0]?.nextScanAt?.toISOString(),
    });
  }
  const alerts = [
    ...stale.map((row) => ({
      organizationId: row.organizationId,
      projectId: row.projectId,
      dueAt: row.startedAt,
      reason:
        row.errorCode === "scan_retry_exhausted"
          ? `Scan start failed for 12 hours (scan ${row.id}); next slot remains scheduled`
          : `Scan ${row.id} stopped before completing`,
      dedupeSeconds: GEO_SCAN_ALERTS.staleLookbackSeconds,
    })),
    ...overdue.flatMap((row) =>
      row.nextScanAt
        ? [
            {
              organizationId: row.organizationId,
              projectId: row.projectId,
              dueAt: row.nextScanAt,
              lastScanAt: row.lastScanAt,
              reason:
                row.scanLeaseUntil && row.scanLeaseUntil > new Date()
                  ? `Scan start is leased until ${row.scanLeaseUntil.toISOString()}`
                  : "Scheduled scan has not started",
            },
          ]
        : []
    ),
  ];
  if (alerts.length === 0) {
    return;
  }

  // Rotate the starting point: when Slack stays unavailable, an old failing
  // batch must not prevent newer missed scans from being attempted next tick.
  const first =
    (Math.floor(startedAt / GEO_SCAN_ALERTS.sweepIntervalMs) *
      GEO_SCAN_ALERTS.concurrency) %
    alerts.length;
  const pending = [...alerts.slice(first), ...alerts.slice(0, first)];
  for (
    let index = 0;
    index < pending.length && Date.now() - startedAt < GEO_SCAN_ALERTS.budgetMs;
    index += GEO_SCAN_ALERTS.concurrency
  ) {
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- each bounded batch finishes before the next starts
    await Promise.all(
      pending
        .slice(index, index + GEO_SCAN_ALERTS.concurrency)
        .map(async (alert) => {
          try {
            await alertMissedGeoScan(alert);
          } catch (error) {
            logWorkflowTelemetry({
              event: "geo.scan.alert_failed",
              outcome: "error",
              projectId: alert.projectId,
              organizationId: alert.organizationId,
              errorName: error instanceof Error ? error.name : "UnknownError",
              errorMessage:
                error instanceof Error ? error.message : String(error),
            });
          }
        })
    );
  }
}
