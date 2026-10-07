import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

import { Effect, Layer } from "effect";

const sweepResult = {
  due: 3,
  started: 1,
  covered: 1,
  leaseLost: 0,
  alreadyRunning: 1,
  failed: 0,
  advanceLost: 0,
  staleScansFailed: 4,
};
const sweep = mock((): Effect.Effect<typeof sweepResult, Error> =>
  Effect.succeed(sweepResult)
);
mock.module("@notra/geo-core/geo/scan-schedule", () => ({
  runGeoScanCronSweep: sweep,
}));
const flushGeoLog = mock(async () => undefined);
const log = { info: mock(), warn: mock(), error: mock() };
// The whole evlog surface is stubbed, not just `flushGeoLog`: a partial module
// mock is process-wide and would break every other suite importing it.
mock.module("@notra/ai/evlog", () => ({
  log,
  geoLog: log,
  geoLogDrainEnabled: true,
  flushGeoLog,
  flushLogs: async () => undefined,
  useLogger: () => ({
    getContext: () => ({}),
    set: () => undefined,
  }),
  withEvlog: (handler: unknown) => handler,
  createError: (message: unknown) => new Error(String(message)),
  setLogFlushScheduler: () => undefined,
  register: () => undefined,
  onRequestError: () => undefined,
}));
mock.module("@/lib/geo/configure", () => ({
  geoCoreDashboardLayer: Layer.empty,
}));
const { GET } = await import("../src/app/api/cron/geo-scan/route");
const originalSecret = process.env.CRON_SECRET;

afterAll(() => {
  if (originalSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalSecret;
  }
});
beforeEach(() => {
  process.env.CRON_SECRET = "cron-test-secret";
  sweep.mockReset();
  sweep.mockImplementation(() => Effect.succeed(sweepResult));
  flushGeoLog.mockClear();
});

describe("GET /api/cron/geo-scan", () => {
  test.each([
    undefined,
    "Bearer wrong",
    "cron-test-secret",
    "Basic cron-test-secret",
  ])(
    "rejects authorization %s before running any scan",
    async (authorization) => {
      const response = await GET(
        new Request("http://localhost/api/cron/geo-scan", {
          headers: authorization ? { authorization } : {},
        })
      );
      expect(response.status).toBe(401);
      expect(sweep).not.toHaveBeenCalled();
    }
  );

  test("fails closed when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(
      new Request("http://localhost/api/cron/geo-scan", {
        headers: { authorization: "Bearer undefined" },
      })
    );
    expect(response.status).toBe(401);
    expect(sweep).not.toHaveBeenCalled();
  });
});
