import { beforeEach, expect, mock, test } from "bun:test";

const SETTLE_MS = 40;
const MIN_INTERVAL_MS = 120;
const actualConstants = await import("../src/constants/geo");
const publishGeoTrafficChange = mock(
  async (_organizationId: string, _projectIds: string[]) => undefined
);

mock.module("../src/constants/geo", () => ({
  ...actualConstants,
  GEO_TRAFFIC_LIVE_SETTLE_MS: SETTLE_MS,
  GEO_TRAFFIC_LIVE_MIN_INTERVAL_MS: MIN_INTERVAL_MS,
}));
mock.module("../src/geo/live", () => ({ publishGeoTrafficChange }));

const { announceGeoTrafficEvent } = await import("../src/ingest/live");

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

beforeEach(() => {
  publishGeoTrafficChange.mockClear();
});

test("a burst of one organization settles into one publish", async () => {
  await Promise.all([
    announceGeoTrafficEvent("org_1", "proj_1"),
    announceGeoTrafficEvent("org_1", "proj_2"),
    announceGeoTrafficEvent("org_2", ""),
  ]);

  expect(publishGeoTrafficChange).toHaveBeenCalledTimes(2);
  expect(publishGeoTrafficChange).toHaveBeenCalledWith("org_1", [
    "proj_1",
    "proj_2",
  ]);
  expect(publishGeoTrafficChange).toHaveBeenCalledWith("org_2", [""]);
  await wait(SETTLE_MS * 2);
  expect(publishGeoTrafficChange).toHaveBeenCalledTimes(2);
});

test("an event late in a window resolves only after its own announcement", async () => {
  const first = announceGeoTrafficEvent("org_3", "proj_1");
  await wait(SETTLE_MS / 2);
  const late = announceGeoTrafficEvent("org_3", "proj_1");

  await first;
  await late;
  expect(publishGeoTrafficChange).toHaveBeenCalledTimes(2);
  await wait(MIN_INTERVAL_MS * 2);
  expect(publishGeoTrafficChange).toHaveBeenCalledTimes(2);
});

test("a busy organization announces at most once per interval", async () => {
  await announceGeoTrafficEvent("org_4", "proj_1");
  const startedAt = Date.now();
  await announceGeoTrafficEvent("org_4", "proj_1");

  expect(publishGeoTrafficChange).toHaveBeenCalledTimes(2);
  expect(Date.now() - startedAt).toBeGreaterThanOrEqual(MIN_INTERVAL_MS - 10);
});
