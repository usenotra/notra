import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { readFile } from "node:fs/promises";

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
// The whole evlog surface is stubbed, not just `flushGeoLog`: a partial module
// mock is process-wide and would break every other suite importing it.
mock.module("@notra/ai/evlog", () => ({
  flushGeoLog,
  geoLog: { info: mock(), warn: mock(), error: mock() },
  geoLogDrainEnabled: true,
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

  test("returns the actual sweep counters after an authorized request", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/geo-scan", {
        headers: { authorization: "Bearer cron-test-secret" },
      })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(sweepResult);
    expect(sweep).toHaveBeenCalledTimes(1);
    // The buffered sweep log has to reach the drain before the function ends.
    expect(flushGeoLog).toHaveBeenCalledTimes(1);
  });

  test("does not report success when the sweep fails", async () => {
    sweep.mockImplementationOnce(() =>
      Effect.fail(new Error("Database unavailable"))
    );
    await expect(
      GET(
        new Request("http://localhost/api/cron/geo-scan", {
          headers: { authorization: "Bearer cron-test-secret" },
        })
      )
    ).rejects.toThrow("Database unavailable");
    expect(flushGeoLog).toHaveBeenCalledTimes(1);
  });

  test("Vercel actually registers the tested endpoint as a recurring cron", async () => {
    const config = JSON.parse(
      await readFile(new URL("../vercel.json", import.meta.url), "utf8")
    );
    expect(config.crons).toContainEqual({
      path: "/api/cron/geo-scan",
      schedule: "*/10 * * * *",
    });
  });
});
