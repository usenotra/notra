import { beforeEach, expect, mock, test } from "bun:test";

const dueRows = mock(async () => [] as unknown[]);
const staleRows = mock(async () => [] as unknown[]);
mock.module("@notra/db/drizzle", () => ({
  db: {
    query: {
      geoSettings: { findMany: dueRows },
      geoScans: { findMany: staleRows },
    },
  },
}));
const alert = mock(async (_input: unknown) => undefined);
mock.module("@notra/geo-core/utils/geo-scan-alert", () => ({
  alertMissedGeoScan: alert,
}));
const telemetry = mock(() => undefined);
mock.module("@/utils/workflow-telemetry", () => ({
  logWorkflowTelemetry: telemetry,
}));

const { checkMissedGeoScans } =
  await import("../src/lib/analytics/geo-scan-watchdog");

beforeEach(() => {
  dueRows.mockReset();
  dueRows.mockImplementation(async () => []);
  staleRows.mockReset();
  staleRows.mockImplementation(async () => []);
  alert.mockReset();
  alert.mockImplementation(async () => undefined);
  telemetry.mockClear();
});

test("retries a failed stale-scan alert on the next monitoring sweep", async () => {
  staleRows.mockImplementation(async () => [
    {
      id: "scan-1",
      errorCode: "scan_stale",
      organizationId: "org-1",
      projectId: "project-1",
      startedAt: new Date("2026-09-20T12:00:00Z"),
    },
  ]);
  alert.mockImplementationOnce(async () => {
    throw new Error("Slack unavailable");
  });

  await checkMissedGeoScans();
  await checkMissedGeoScans();

  expect(alert).toHaveBeenCalledTimes(2);
  expect(alert.mock.calls[0]?.[0]).toMatchObject({
    projectId: "project-1",
    dueAt: new Date("2026-09-20T12:00:00Z"),
    dedupeSeconds: 7 * 24 * 60 * 60,
  });
  expect(telemetry).toHaveBeenCalledWith(
    expect.objectContaining({ event: "geo.scan.alert_failed" })
  );
});

test("reports an exhausted start window via the same retryable alert path", async () => {
  staleRows.mockImplementation(async () => [
    {
      id: "scan-2",
      errorCode: "scan_retry_exhausted",
      organizationId: "org-1",
      projectId: "project-2",
      startedAt: new Date("2026-09-20T12:00:00Z"),
    },
  ]);
  await checkMissedGeoScans();
  expect(alert.mock.calls[0]?.[0]).toMatchObject({
    projectId: "project-2",
    reason: expect.stringContaining("failed for 12 hours"),
  });
});

test("limits simultaneous Slack requests for a large overdue batch", async () => {
  dueRows.mockImplementation(async () =>
    Array.from({ length: 25 }, (_, index) => ({
      organizationId: "org-1",
      projectId: `project-${index}`,
      nextScanAt: new Date("2026-09-20T12:00:00Z"),
      lastScanAt: null,
      scanLeaseUntil: null,
    }))
  );
  let active = 0;
  let maxActive = 0;
  alert.mockImplementation(async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await Promise.resolve();
    active--;
  });

  await checkMissedGeoScans();

  expect(maxActive).toBe(5);
  expect(alert).toHaveBeenCalledTimes(25);
});

test("stops alert batches when the monitoring budget is exhausted", async () => {
  dueRows.mockImplementation(async () =>
    Array.from({ length: 25 }, (_, index) => ({
      organizationId: "org-1",
      projectId: `project-${index}`,
      nextScanAt: new Date("2026-09-20T12:00:00Z"),
      lastScanAt: null,
      scanLeaseUntil: null,
    }))
  );
  const originalNow = Date.now;
  let now = originalNow();
  Date.now = () => now;
  alert.mockImplementation(async () => {
    now += 5000;
  });
  try {
    await checkMissedGeoScans();
    expect(alert).toHaveBeenCalledTimes(5);
  } finally {
    Date.now = originalNow;
  }
});
