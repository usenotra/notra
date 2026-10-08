import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { Effect } from "effect";

if (process.env.NOTRA_WEB_TREND_TEST_WORKER !== "1") {
  test("web audience comparison mapping in an isolated process", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_WEB_TREND_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  }, 35_000);
} else {
  await import("./utils/infrastructure");
  const { database, initializeDatabase, seedProject } =
    await import("./utils/database");
  const client = await import("@notra/analytics/tinybird/client");
  let previous: bigint | undefined = 6n;
  const empty = async () => ({ data: [] });
  mock.module("@notra/analytics/tinybird/client", () => ({
    ...client,
    isTinybirdConfigured: () => true,
    queryWebOverview: empty,
    queryWebTimeseries: empty,
    queryWebPages: empty,
    queryWebSources: empty,
    queryWebHosts: empty,
    queryWebAiOutcomes: empty,
    queryWebAudience: async (params: { dimension: string }) => ({
      data: [
        {
          value: params.dimension === "country" ? "DE" : "desktop",
          visitors: 3n,
          previous_visitors: previous,
          views: 5n,
        },
      ],
    }),
  }));
  const { loadWebAnalytics } = await import("../src/geo/web-analytics");
  beforeAll(initializeDatabase, 30_000);
  afterAll(() => database.postgres.close());

  test("audience comparisons preserve distinct previous visitors and real zero baselines", async () => {
    const scope = await seedProject("trend-mapping");
    previous = 6n;
    const response = await Effect.runPromise(
      loadWebAnalytics(scope, { days: 7 }, undefined)
    );
    expect(response.countries).toEqual([
      { value: "DE", visitors: 3, previousVisitors: 6 },
    ]);
    expect(response.devices).toEqual([
      { value: "desktop", visitors: 3, previousVisitors: 6 },
    ]);
    previous = 0n;
    const newTraffic = await Effect.runPromise(
      loadWebAnalytics(scope, { days: 7 }, undefined)
    );
    expect(newTraffic.countries[0]?.previousVisitors).toBe(0);
  });

  test("an old audience pipe does not invent a zero comparison", async () => {
    const scope = await seedProject("trend-legacy");
    previous = undefined;
    const response = await Effect.runPromise(
      loadWebAnalytics(scope, { days: 7 }, undefined)
    );
    expect(response.countries[0]?.previousVisitors).toBeNull();
    expect(response.devices[0]?.previousVisitors).toBeNull();
  });
}
