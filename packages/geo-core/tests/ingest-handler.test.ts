import { beforeEach, describe, expect, mock, test } from "bun:test";

import { Effect } from "effect";

import {
  GeoIngestInvalidTokenError,
  GeoIngestRateLimitedError,
} from "../src/ingest/errors";

const geoLogInfo = mock((_event: Record<string, unknown>) => {});
let runOutcome: () => Effect.Effect<unknown, unknown> = () => Effect.void;

mock.module("@notra/ai/evlog", () => ({
  geoLog: { info: geoLogInfo, warn: () => {}, error: () => {} },
  flushGeoLog: async () => {},
}));
mock.module("../src/ingest/pipeline", () => ({
  runGeoIngest: () => runOutcome(),
}));

const { handleGeoIngestRequest } = await import("../src/ingest/handler");

const request = new Request("https://ingest.example/api/geo/ingest", {
  method: "POST",
});

async function handle() {
  const response = await handleGeoIngestRequest(request, () => {});
  const event = geoLogInfo.mock.calls[0]?.[0];
  return { response, event };
}

describe("handleGeoIngestRequest", () => {
  beforeEach(() => {
    geoLogInfo.mockClear();
  });

  test("logs rejected requests with their reason", async () => {
    runOutcome = () => Effect.fail(new GeoIngestInvalidTokenError({}));

    const { response, event } = await handle();

    expect(response.status).toBe(401);
    expect(event).toMatchObject({
      outcome: "rejected",
      reason: "invalid_token",
      status: 401,
    });
  });

  test("attributes rate-limit hits to the organization", async () => {
    runOutcome = () =>
      Effect.fail(new GeoIngestRateLimitedError({ organizationId: "org_1" }));

    const { response, event } = await handle();

    expect(response.status).toBe(429);
    expect(event).toMatchObject({
      reason: "rate_limited",
      organizationId: "org_1",
    });
  });

  test("answers and logs defects instead of throwing", async () => {
    runOutcome = () => Effect.die(new Error("boom"));

    const { response, event } = await handle();

    expect(response.status).toBe(502);
    expect(event).toMatchObject({
      outcome: "failed",
      reason: "defect",
      errorMessage: "boom",
    });
  });
});
