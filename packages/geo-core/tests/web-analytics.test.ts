import { afterAll, beforeAll, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { Effect } from "effect";

if (process.env.NOTRA_WEB_ANALYTICS_TEST_WORKER !== import.meta.url) {
  test("web analytics uses validated scopes without tracking lookups", () => {
    const result = spawnSync(
      process.execPath,
      ["test", "--isolate", fileURLToPath(import.meta.url)],
      {
        env: {
          ...process.env,
          NOTRA_WEB_ANALYTICS_TEST_WORKER: import.meta.url,
        },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  }, 35_000);
} else {
  await import("./utils/infrastructure");
  const { database, initializeDatabase, resetDatabase, seedProject } =
    await import("./utils/database");
  const requests: Record<string, unknown>[] = [];
  let views = 0;
  let configured = true;
  let failedQuery = "";
  const query = mock(async (params: Record<string, unknown>) => {
    requests.push(params);
    return configured ? { data: [] } : null;
  });
  const client = await import("@notra/analytics/tinybird/client");
  mock.module("@notra/analytics/tinybird/client", () => ({
    ...client,
    isTinybirdConfigured: () => configured,
    queryWebOverview: async (params: Record<string, unknown>) => {
      requests.push(params);
      if (failedQuery === "overview") {
        throw new Error("Tinybird unavailable");
      }
      return configured ? { data: [{ views, visitors: views }] } : null;
    },
    queryWebAiOutcomes: query,
    queryWebAudience: query,
    queryWebHosts: query,
    queryWebPages: query,
    queryWebSources: query,
    queryWebTimeseries: (params: Record<string, unknown>) => {
      if (failedQuery === "timeseries") {
        return Promise.reject(new Error("Tinybird unavailable"));
      }
      return query(params);
    },
    queryWebEngagement: (params: Record<string, unknown>) => {
      if (failedQuery === "engagement") {
        return Promise.resolve(null);
      }
      return query(params);
    },
    queryGeoTrafficOverview: (params: Record<string, unknown>) => {
      if (failedQuery === "traffic") {
        return Promise.reject(new Error("Tinybird unavailable"));
      }
      return query(params);
    },
    queryGeoTrafficTimeseries: query,
    queryGeoTrafficPages: query,
  }));
  const { loadWebAnalytics, loadSiteAnalytics } =
    await import("../src/geo/web-analytics");
  const { GeoProjectNotFoundError, GeoTinybirdError } =
    await import("../src/geo/errors");

  beforeAll(initializeDatabase, 30_000);
  afterAll(() => database.postgres.close());
  beforeEach(async () => {
    await resetDatabase();
    requests.length = 0;
    views = 0;
    configured = true;
    failedQuery = "";
  });

  test("an authenticated project queries data without site or opt-in lookups", async () => {
    const scope = await seedProject("web-data");
    views = 3;
    const response = await Effect.runPromise(
      loadWebAnalytics(scope, { days: 7 }, "www.example.com")
    );
    expect(response.totals.views).toBe(3);
    expect(response).not.toHaveProperty("tracking");
    expect(response).not.toHaveProperty("trackVisitors");
    expect(requests).toHaveLength(8);
    for (const params of requests) {
      expect(params).toMatchObject({
        organization_id: scope.organizationId,
        project_id: scope.projectId,
        site_id: "",
      });
    }
    expect(
      requests.filter((params) => params.hosts === "example.com")
    ).toHaveLength(7);
  });

  test("a foreign project is rejected before any analytics query", async () => {
    const scope = await seedProject("foreign-web", {
      organizationId: "other-org",
    });
    const outcome = await Effect.runPromise(
      Effect.result(
        loadWebAnalytics(
          { ...scope, organizationId: "org-test" },
          { days: 7 },
          undefined
        )
      )
    );
    expect(outcome._tag === "Failure" && outcome.failure).toBeInstanceOf(
      GeoProjectNotFoundError
    );
    expect(requests).toEqual([]);
  });

  test("site queries keep stable identity across origins and sibling sites", async () => {
    const scope = await seedProject("site-data");
    for (const [siteId, publicOrigin] of [
      ["site-a", "https://shared.example"],
      ["site-b", "https://shared.example"],
      ["site-a", "https://changed.example"],
    ] as const) {
      requests.length = 0;
      await Effect.runPromise(
        loadSiteAnalytics(
          {
            ...scope,
            id: siteId,
            publicOrigin,
          },
          { days: 7 }
        )
      );
      expect(requests).toHaveLength(11);
      for (const params of requests) {
        expect(params).toMatchObject({
          organization_id: scope.organizationId,
          project_id: "",
          site_id: siteId,
          hosts: "",
        });
      }
    }
  });

  test.each(["overview", "timeseries", "engagement", "traffic"])(
    "failed site %s queries do not become empty analytics",
    async (failure) => {
      const scope = await seedProject(`failed-${failure}`);
      failedQuery = failure;
      const result = await Effect.runPromise(
        Effect.result(
          loadSiteAnalytics(
            { ...scope, id: "site-test", publicOrigin: "https://site.example" },
            { days: 7 }
          )
        )
      );
      expect(result._tag === "Failure" && result.failure).toBeInstanceOf(
        GeoTinybirdError
      );
    }
  );

  test("unconfigured site analytics keeps its unavailable signal", async () => {
    const scope = await seedProject("unconfigured-site");
    configured = false;
    const response = await Effect.runPromise(
      loadSiteAnalytics(
        { ...scope, id: "site-test", publicOrigin: "https://site.example" },
        { days: 7 }
      )
    );
    expect(response.web.configured).toBe(false);
    expect(response.web.totals.views).toBe(0);
  });

  test("a project without recorded visitors returns empty analytics, not a tracking flag", async () => {
    const scope = await seedProject("empty-web");
    const response = await Effect.runPromise(
      loadWebAnalytics(scope, { days: 7 }, undefined)
    );
    expect(response.totals.views).toBe(0);
    expect(response.hosts).toEqual([]);
    expect(response.pages).toEqual([]);
    expect(response).not.toHaveProperty("tracking");
    expect(response).not.toHaveProperty("trackVisitors");
  });
}
