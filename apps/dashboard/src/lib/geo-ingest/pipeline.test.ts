import { beforeEach, describe, expect, mock, test } from "bun:test";

import type { GeoIngestIdentity } from "@notra/geo-core/types/geo";

import type { GeoVisitorClassification } from "@/types/geo";

const CRAWLER_CLASSIFICATION: GeoVisitorClassification = {
  visitorType: "crawler",
  source: "GPTBot",
  agent: "GPTBot",
  category: "training-crawler",
  confidence: "certain",
};

const HUMAN_CLASSIFICATION: GeoVisitorClassification = {
  visitorType: "human",
  source: "human",
  agent: "",
  category: "",
  confidence: "",
};

const ingestGeoTrafficEvents = mock(async () => null);
const isGeoIngestIdentityActive = mock(async () => true);
const loadIngestAllowedHosts = mock(async (): Promise<string[] | null> => [
  "example.com",
]);
const ratelimitLimit = mock(async () => ({ success: true }));
const trackGeoIngestAnalytics = mock(async () => {});
const geoLogInfo = mock(() => {});
const flushGeoLog = mock(async () => {});
const verifyGeoIngestToken = mock((): GeoIngestIdentity => ({
  organizationId: "org_1",
  projectId: "proj_1",
  generation: 1,
}));
const classifyVisitor = mock(
  (): GeoVisitorClassification => CRAWLER_CLASSIFICATION
);
const resolveJourneyId = mock(() => ({ journeyId: "journey_1", path: "/" }));

mock.module("@notra/analytics/tinybird/client", () => ({
  ingestGeoTrafficEvents,
}));
mock.module("@notra/ai/evlog", () => ({
  geoLog: { info: geoLogInfo, warn: () => {}, error: () => {} },
  flushGeoLog,
}));
mock.module("@notra/geo-core/geo/ingest", () => ({
  verifyGeoIngestToken,
  getGeoIngestTokenGeneration: async () => 1,
  geoIngestHostsCacheKey: () => "hosts:key",
}));
mock.module("@/lib/geo-ingest/classify-visitor", () => ({
  classifyVisitor,
}));
mock.module("@/lib/geo-ingest/identity", () => ({
  isGeoIngestIdentityActive,
}));
mock.module("@/lib/geo-ingest/hosts", () => ({
  loadIngestAllowedHosts,
}));
mock.module("@/lib/geo-ingest/analytics", () => ({
  trackGeoIngestAnalytics,
}));
mock.module("@/lib/geo-ingest/journey", () => ({
  resolveJourneyId,
}));
mock.module("@/utils/ratelimit", () => ({
  ratelimit: { geoIngest: { limit: ratelimitLimit } },
}));
mock.module("next/server", () => ({
  after: () => {},
}));

const { Effect } = await import("effect");
const { runGeoIngest } = await import("./pipeline");
const {
  GeoIngestInvalidPayloadError,
  GeoIngestInvalidTokenError,
  GeoIngestFailedError,
  GeoIngestUnparseableUrlError,
} = await import("./errors");

function ingestRequest(
  body: unknown = { method: "GET", url: "https://example.com/" }
) {
  return {
    headers: new Headers({ authorization: "Bearer token_1" }),
    json: async () => body,
  } as never;
}

async function run(request: unknown) {
  return Effect.runPromise(
    Effect.result(runGeoIngest(request as never)) as never
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
      geoLogInfo,
      flushGeoLog,
    ]) {
      m.mockClear();
    }
    verifyGeoIngestToken.mockClear();
    verifyGeoIngestToken.mockImplementation(() => ({
      organizationId: "org_1",
      projectId: "proj_1",
      generation: 1,
    }));
    classifyVisitor.mockClear();
    resolveJourneyId.mockClear();
    classifyVisitor.mockImplementation(() => CRAWLER_CLASSIFICATION);
    isGeoIngestIdentityActive.mockImplementation(async () => true);
    loadIngestAllowedHosts.mockImplementation(async () => ["example.com"]);
    ratelimitLimit.mockImplementation(async () => ({ success: true }));
  });

  test("drops untracked visitors without any Redis/DB/Tinybird I/O", async () => {
    classifyVisitor.mockImplementation(() => HUMAN_CLASSIFICATION);

    const outcome = await run(ingestRequest());

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
