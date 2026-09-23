import { afterAll, beforeEach, expect, mock, test } from "bun:test";

const set = mock(async (): Promise<"OK" | null> => "OK");
const del = mock(async () => 1);
mock.module("@notra/ai/utils/redis", () => ({ redis: { set, del } }));

const { alertMissedGeoScan } = await import("../src/utils/geo-scan-alert");
const originalWebhook = process.env.GEO_SCAN_ALERT_WEBHOOK_URL;
const originalFetch = globalThis.fetch;
const send = mock(async () => new Response("ok"));

afterAll(() => {
  globalThis.fetch = originalFetch;
  if (originalWebhook === undefined) {
    delete process.env.GEO_SCAN_ALERT_WEBHOOK_URL;
  } else {
    process.env.GEO_SCAN_ALERT_WEBHOOK_URL = originalWebhook;
  }
});
beforeEach(() => {
  process.env.GEO_SCAN_ALERT_WEBHOOK_URL = "https://hooks.slack.com/test";
  globalThis.fetch = send as typeof fetch;
  set.mockReset();
  set.mockImplementation(async () => "OK");
  del.mockClear();
  send.mockReset();
  send.mockImplementation(async () => new Response("ok"));
});

const slot = {
  organizationId: "org-1",
  projectId: "project-1",
  dueAt: new Date("2026-09-23T12:00:00Z"),
  lastScanAt: new Date("2026-09-22T12:00:00Z"),
  reason: "Scheduled scan has not started",
};

test("sends one actionable Slack message per slot", async () => {
  await alertMissedGeoScan(slot);
  set.mockImplementationOnce(async () => null);
  await alertMissedGeoScan(slot);

  expect(set).toHaveBeenCalledWith(
    "geo:scan:missed-alert:project-1:2026-09-23T12:00:00.000Z",
    "pending",
    { nx: true, ex: 30 }
  );
  expect(set).toHaveBeenCalledWith(expect.any(String), "sent", { ex: 86_400 });
  expect(send).toHaveBeenCalledTimes(1);
  const [url, options] = send.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("https://hooks.slack.com/test");
  const message = JSON.parse(String(options.body)).text;
  expect(message).toContain("Organization: org-1");
  expect(message).toContain("Slot / run start: 2026-09-23T12:00:00.000Z");
  expect(message).toContain("Last attempt: 2026-09-22T12:00:00.000Z");
});

test("releases the deduplication key if Slack rejects the alert", async () => {
  send.mockImplementationOnce(
    async () => new Response("error", { status: 500 })
  );
  await expect(alertMissedGeoScan(slot)).rejects.toThrow("HTTP 500");
  expect(del).toHaveBeenCalledTimes(1);
  await alertMissedGeoScan(slot);
  expect(send).toHaveBeenCalledTimes(2);
});

test("keeps the claim when recording an accepted Slack alert fails", async () => {
  set
    .mockImplementationOnce(async () => "OK")
    .mockImplementationOnce(async () => {
      throw new Error("Redis unavailable");
    });
  await expect(alertMissedGeoScan(slot)).rejects.toThrow("Redis unavailable");
  expect(send).toHaveBeenCalledTimes(1);
  expect(del).not.toHaveBeenCalled();
});

test("keeps a delivered stale-run alert deduplicated for the retry window", async () => {
  await alertMissedGeoScan({ ...slot, dedupeSeconds: 7 * 86_400 });
  expect(set).toHaveBeenCalledWith(expect.any(String), "sent", {
    ex: 7 * 86_400,
  });
});

test("does not send when no webhook is configured", async () => {
  delete process.env.GEO_SCAN_ALERT_WEBHOOK_URL;
  await alertMissedGeoScan(slot);
  expect(set).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});
