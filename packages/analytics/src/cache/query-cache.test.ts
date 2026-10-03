import { beforeEach, describe, expect, mock, test } from "bun:test";

interface StoredEntry {
  value: unknown;
}

function createFakeRedis() {
  const store = new Map<string, StoredEntry>();
  return {
    store,
    get: mock(async (key: string) => store.get(key)?.value ?? null),
    set: mock(async (key: string, value: unknown) => {
      store.set(key, { value });
      return "OK";
    }),
    incr: mock(async (key: string) => {
      const next = Number(store.get(key)?.value ?? 0) + 1;
      store.set(key, { value: next });
      return next;
    }),
    pipeline() {
      const reads: string[] = [];
      const builder = {
        get(key: string) {
          reads.push(key);
          return builder;
        },
        exec() {
          return Promise.resolve(
            reads.map((key) => store.get(key)?.value ?? null)
          );
        },
      };
      return builder;
    },
  };
}

let redis = createFakeRedis();

mock.module("./redis", () => ({
  getAnalyticsRedis: () => redis,
}));

const { bumpPurgeGeneration, cachedQuery, geoLiveTtlSeconds } =
  await import("./query-cache");

function liveOptions(fetch: () => Promise<unknown>) {
  return {
    scope: "geo" as const,
    pipe: "geo_traffic_overview",
    organizationId: "org_1",
    params: { organization_id: "org_1", days: 30 },
    fetch,
  };
}

describe("cachedQuery live scope", () => {
  beforeEach(() => {
    redis = createFakeRedis();
  });

  test("serves the cached entry while the purge generation is unchanged", async () => {
    const fetch = mock(async () => ({ visits: 1 }));

    const first = await cachedQuery(liveOptions(fetch));
    const second = await cachedQuery(liveOptions(fetch));

    expect(first).toEqual({ visits: 1 });
    expect(second).toEqual({ visits: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("entries from before a purge are not served after the generation bump", async () => {
    const staleFetch = mock(async () => ({ visits: 1 }));
    const freshFetch = mock(async () => ({ visits: 2 }));

    await cachedQuery(liveOptions(staleFetch));
    await bumpPurgeGeneration("geo", "org_1");

    const after = await cachedQuery(liveOptions(freshFetch));

    expect(after).toEqual({ visits: 2 });
    expect(freshFetch).toHaveBeenCalledTimes(1);
  });

  test("an in-flight pre-purge fetch cannot write deleted data back", async () => {
    let resolveStaleFetch: (value: unknown) => void = () => {};
    const staleFetch = mock(
      () =>
        new Promise((resolve) => {
          resolveStaleFetch = resolve;
        })
    );

    const inFlight = cachedQuery(liveOptions(staleFetch));
    // Wait until the pre-purge fetch is actually in flight, then purge
    // before it resolves — the interleaving from the review finding.
    while (staleFetch.mock.calls.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    await bumpPurgeGeneration("geo", "org_1");
    resolveStaleFetch({ visits: "pre-purge" });
    await inFlight;

    const freshFetch = mock(async () => ({ visits: "post-purge" }));
    const after = await cachedQuery(liveOptions(freshFetch));

    expect(after).toEqual({ visits: "post-purge" });
    expect(freshFetch).toHaveBeenCalledTimes(1);
  });

  test("a purge in one org does not invalidate another org's entries", async () => {
    const fetch = mock(async () => ({ visits: 1 }));
    await cachedQuery(liveOptions(fetch));

    await bumpPurgeGeneration("geo", "org_other");

    const again = await cachedQuery(liveOptions(fetch));
    expect(again).toEqual({ visits: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("geoLiveTtlSeconds", () => {
  const minute = 60_000;

  test("keeps entries until the next flush window has settled", () => {
    expect(geoLiveTtlSeconds(Date.UTC(2026, 9, 3, 10, 1))).toBe(4 * 60 + 20);
  });

  test("entries cached before the batch is readable expire at the settle point", () => {
    expect(geoLiveTtlSeconds(Date.UTC(2026, 9, 3, 10, 5) + 5000)).toBe(15);
  });

  test("falls back to the plain live TTL without batching", () => {
    expect(geoLiveTtlSeconds(Date.UTC(2026, 9, 3, 10, 1), 0)).toBe(30);
  });

  test("entries cached right after settling last the whole window", () => {
    expect(geoLiveTtlSeconds(Date.UTC(2026, 9, 3, 10, 5) + 20_000)).toBe(
      (5 * minute) / 1000
    );
  });
});
