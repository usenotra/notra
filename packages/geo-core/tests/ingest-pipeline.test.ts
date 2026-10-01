import { beforeEach, describe, expect, mock, test } from "bun:test";

import type { GeoIngestIdentity } from "@notra/geo-core/types/geo";
import type { Ratelimit } from "@upstash/ratelimit";
import { Effect } from "effect";

const ingestGeoTrafficEvents = mock(async () => null);
const isGeoIngestIdentityActive = mock(async () => true);
const loadIngestAllowedHosts = mock(async (): Promise<string[] | null> => [
  "example.com",
]);
const ratelimitLimit = mock(
  async (): Promise<
    Pick<Awaited<ReturnType<Ratelimit["limit"]>>, "success" | "reason">
  > => ({
    success: true,
  })
);
const trackGeoIngestAnalytics = mock(() => Effect.void);
const verifyGeoIngestToken = mock((): GeoIngestIdentity => ({
  organizationId: "org_1",
  projectId: "proj_1",
  generation: 1,
}));
const resolveJourneyId = mock(() => ({ journeyId: "journey_1", path: "/" }));

mock.module("@notra/analytics/tinybird/client", () => ({
  ingestGeoTrafficEvents,
}));
mock.module("@notra/geo-core/geo/ingest", () => ({
  verifyGeoIngestToken,
  getGeoIngestTokenGeneration: async () => 1,
  geoIngestHostsCacheKey: () => "hosts:key",
}));
mock.module("../src/ingest/identity", () => ({
  isGeoIngestIdentityActive,
}));
mock.module("../src/ingest/hosts", () => ({
  loadIngestAllowedHosts,
}));
mock.module("../src/ingest/analytics", () => ({
  trackGeoIngestAnalytics,
}));
mock.module("../src/ingest/journey", () => ({
  resolveJourneyId,
}));
mock.module("../src/ingest/ratelimit", () => ({
  geoIngestRatelimit: { limit: ratelimitLimit },
}));

const { runGeoIngest } = await import("../src/ingest/pipeline");
const {
  GeoIngestInvalidPayloadError,
  GeoIngestInvalidTokenError,
  GeoIngestFailedError,
  GeoIngestRateLimitedError,
  GeoIngestUnparseableUrlError,
} = await import("../src/ingest/errors");

function ingestRequest(
  body: unknown = {
    method: "GET",
    url: "https://example.com/",
    userAgent: "GPTBot",
  }
) {
  return {
    headers: new Headers({ authorization: "Bearer token_1" }),
    json: async () => body,
  } as never;
}

async function run(request: unknown) {
  return Effect.runPromise(
    Effect.result(runGeoIngest(request as never, () => {})) as never
  ) as Promise<
    | { _tag: "Success"; success: unknown }
    | { _tag: "Failure"; failure: unknown }
  >;
}

describe("runGeoIngest ordering", () => {
  beforeEach(() => {
    for (const m of [
      ingestGeoTrafficEvents,
      isGeoIngestIdentityActive,
      loadIngestAllowedHosts,
      ratelimitLimit,
      trackGeoIngestAnalytics,
    ]) {
      m.mockClear();
    }
    verifyGeoIngestToken.mockClear();
    verifyGeoIngestToken.mockImplementation(() => ({
      organizationId: "org_1",
      projectId: "proj_1",
      generation: 1,
    }));
    resolveJourneyId.mockClear();
    isGeoIngestIdentityActive.mockImplementation(async () => true);
    loadIngestAllowedHosts.mockImplementation(async () => ["example.com"]);
    ratelimitLimit.mockImplementation(async () => ({ success: true }));
  });

  test("drops untracked visitors without any Redis/DB/Tinybird I/O", async () => {
    const outcome = await run(
      ingestRequest({
        method: "GET",
        url: "https://example.com/",
        userAgent: "Mozilla/5.0",
      })
    );

    expect(outcome._tag).toBe("Success");
    expect(isGeoIngestIdentityActive).not.toHaveBeenCalled();
    expect(loadIngestAllowedHosts).not.toHaveBeenCalled();
    expect(ratelimitLimit).not.toHaveBeenCalled();
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("ingests tracked traffic after identity and host checks", async () => {
    const outcome = await run(ingestRequest());

    expect(outcome._tag).toBe("Success");
    expect(isGeoIngestIdentityActive).toHaveBeenCalledTimes(1);
    expect(loadIngestAllowedHosts).toHaveBeenCalledTimes(1);
    expect(ratelimitLimit).toHaveBeenCalledTimes(1);
    expect(ingestGeoTrafficEvents).toHaveBeenCalledTimes(1);
  });

  test("defers analytics until after the event was stored", async () => {
    const tasks: Array<() => Promise<void>> = [];
    await Effect.runPromise(
      runGeoIngest(ingestRequest(), (task) => tasks.push(task))
    );

    expect(ingestGeoTrafficEvents).toHaveBeenCalledTimes(1);
    expect(trackGeoIngestAnalytics).not.toHaveBeenCalled();
    expect(tasks).toHaveLength(1);
    await tasks[0]?.();
    expect(trackGeoIngestAnalytics).toHaveBeenCalledTimes(1);
  });

  test("rejects tracked traffic when the rate-limit transport fails", async () => {
    ratelimitLimit.mockImplementation(async () => {
      throw new Error("Redis unavailable");
    });
    const outcome = await run(ingestRequest());
    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestFailedError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("rejects Upstash timeout responses even when success is true", async () => {
    ratelimitLimit.mockImplementation(async () => ({
      success: true,
      reason: "timeout",
    }));
    const outcome = await run(ingestRequest());
    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestFailedError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("rejects actual rate-limit hits without writing an event", async () => {
    ratelimitLimit.mockImplementation(async () => ({ success: false }));
    const outcome = await run(ingestRequest());
    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestRateLimitedError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("rejects revoked identities for tracked traffic with 401", async () => {
    isGeoIngestIdentityActive.mockImplementation(async () => false);

    const outcome = await run(ingestRequest());

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestInvalidTokenError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("drops tracked events for hosts outside the allowed list", async () => {
    loadIngestAllowedHosts.mockImplementation(async () => ["other.example"]);

    const outcome = await run(ingestRequest());

    expect(outcome._tag).toBe("Success");
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("legacy organization tokens do not ingest a sibling project's host", async () => {
    verifyGeoIngestToken.mockImplementation(() => ({
      organizationId: "org_1",
      projectId: null,
      generation: 1,
    }));
    loadIngestAllowedHosts.mockImplementation(async () => ["oldest.example"]);

    const outcome = await run(ingestRequest());

    expect(outcome._tag).toBe("Success");
    expect(loadIngestAllowedHosts).toHaveBeenCalledWith({
      organizationId: "org_1",
      projectId: null,
      generation: 1,
    });
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("legacy organization tokens fail closed if host lookup is unavailable", async () => {
    verifyGeoIngestToken.mockImplementation(() => ({
      organizationId: "org_1",
      projectId: null,
      generation: 1,
    }));
    loadIngestAllowedHosts.mockImplementation(async () => null);

    const outcome = await run(ingestRequest());

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestFailedError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("keeps 401 authoritative when a revoked token sends a malformed payload", async () => {
    isGeoIngestIdentityActive.mockImplementation(async () => false);

    const outcome = await run(ingestRequest({ method: "GET" }));

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestInvalidTokenError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("keeps 401 authoritative when a revoked token sends an unparseable url", async () => {
    isGeoIngestIdentityActive.mockImplementation(async () => false);

    const outcome = await run(ingestRequest({ method: "GET", url: ":::" }));

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestInvalidTokenError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("returns 400 for malformed payloads while the identity is active", async () => {
    const outcome = await run(ingestRequest({ method: "GET" }));

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestInvalidPayloadError);
    }
  });

  test("returns 400 for unparseable urls while the identity is active", async () => {
    const outcome = await run(ingestRequest({ method: "GET", url: ":::" }));

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestUnparseableUrlError);
    }
  });
});
