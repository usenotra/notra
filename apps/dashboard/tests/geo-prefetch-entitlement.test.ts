import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { QueryClient } from "@tanstack/react-query";

if (process.env.NOTRA_GEO_PREFETCH_TEST !== "1") {
  test("GEO prefetch checks membership and entitlement first", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_GEO_PREFETCH_TEST: "1" },
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  });
} else {
  const calls: string[] = [];
  let outcome = "denied";
  let authFailure = false;
  const query = mock(async () => "data");
  mock.module("@/lib/auth/organization", () => ({
    assertOrganizationAccess: async () => {
      calls.push("auth");
      if (authFailure) {
        throw new Error("Forbidden");
      }
    },
  }));
  mock.module("@/lib/billing/subscription", () => ({
    resolveGeoEntitlement: async () => {
      calls.push("billing");
      if (outcome === "error") {
        throw new Error("Billing unavailable");
      }
      return outcome;
    },
  }));
  mock.module("@/lib/orpc/routers/geo", () => ({ geoRouter: {} }));
  mock.module("@/lib/orpc/routers/content", () => ({ contentRouter: {} }));
  mock.module("@orpc/server", () => ({
    createRouterClient: () => ({
      geo: new Proxy({}, { get: () => query }),
      content: { recents: query },
    }),
  }));
  mock.module("@/lib/orpc/query", () => ({
    dashboardOrpc: {
      geo: new Proxy(
        {},
        { get: (_, key) => ({ queryOptions: () => ({ queryKey: [key] }) }) }
      ),
    },
  }));
  mock.module("@/utils/content-recents-prefetch.server", () => ({
    prefetchRecentPostsQuery: () => undefined,
  }));
  mock.module("@/utils/geo-query-client.server", () => ({
    getGeoServerQueryClient: () =>
      new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  }));
  const { dehydrateGeoOverviewQueries, dehydrateGeoTrafficQueries } =
    await import("../src/utils/geo-prefetch.server");
  test.each([dehydrateGeoOverviewQueries, dehydrateGeoTrafficQueries])(
    "guards paid queries before prefetching: %p",
    async (prefetch) => {
      calls.length = 0;
      query.mockClear();
      outcome = "denied";
      const result = await prefetch("org", undefined, {}, new Headers());
      expect(calls).toEqual(["auth", "billing"]);
      expect(result.queries).toHaveLength(0);
      expect(query).not.toHaveBeenCalled();
      outcome = "error";
      await expect(
        prefetch("org", undefined, {}, new Headers())
      ).rejects.toThrow("Billing unavailable");
      expect(query).not.toHaveBeenCalled();
      outcome = "entitled";
      await prefetch("org", undefined, {}, new Headers());
      expect(query).toHaveBeenCalled();
      calls.length = 0;
      authFailure = true;
      await expect(
        prefetch("org", undefined, {}, new Headers())
      ).rejects.toThrow("Forbidden");
      expect(calls).toEqual(["auth"]);
      authFailure = false;
    }
  );
}
