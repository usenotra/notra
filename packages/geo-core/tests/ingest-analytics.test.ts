import { afterEach, expect, mock, spyOn, test } from "bun:test";

import { Effect } from "effect";

import type { GeoIngestAnalyticsInput } from "../src/types/ingest";

const claim = mock(async (): Promise<string | null> => null);
const capture = mock(() => {});
const flush = mock(async () => {});
mock.module("@notra/ai/utils/redis", () => ({ redis: { set: claim } }));
mock.module("@notra/posthog/server", () => ({
  captureServerEvent: capture,
  flushPostHogServer: flush,
}));

const { trackGeoIngestAnalytics } = await import("../src/ingest/analytics");
const input = {
  identity: { organizationId: "org", projectId: "project", generation: 1 },
  event: {
    visitor_type: "crawler",
    source: "GPTBot",
    agent: "GPTBot",
    category: "training-crawler",
    wants_markdown: false,
  },
} as GeoIngestAnalyticsInput;

afterEach(() => {
  mock.restore();
  claim.mockReset();
  claim.mockImplementation(async () => null);
  capture.mockClear();
  flush.mockClear();
});

test("unsampled repeat hits do not flush PostHog", async () => {
  spyOn(Math, "random").mockReturnValue(0.5);
  await Effect.runPromise(trackGeoIngestAnalytics(input));
  expect(capture).not.toHaveBeenCalled();
  expect(flush).not.toHaveBeenCalled();
});

test("first hits capture and flush", async () => {
  spyOn(Math, "random").mockReturnValue(0.5);
  claim.mockImplementation(async () => "OK");
  await Effect.runPromise(trackGeoIngestAnalytics(input));
  expect(capture).toHaveBeenCalledTimes(1);
  expect(flush).toHaveBeenCalledTimes(1);
});

test("sampled repeat hits capture and flush", async () => {
  spyOn(Math, "random").mockReturnValue(0);
  await Effect.runPromise(trackGeoIngestAnalytics(input));
  expect(capture).toHaveBeenCalledTimes(1);
  expect(flush).toHaveBeenCalledTimes(1);
});
