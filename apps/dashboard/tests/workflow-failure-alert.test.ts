import { afterAll, beforeEach, expect, mock, test } from "bun:test";

const claims = new Set<string>();
const redis = {
  set: mock(async (key: string, value: string, options: { nx?: boolean }) => {
    if (options.nx && claims.has(key)) {
      return null;
    }
    claims.add(key);
    return value;
  }),
  del: mock(async (key: string) => {
    claims.delete(key);
    return 1;
  }),
};
mock.module("@notra/ai/utils/redis", () => ({ redis }));

const { alertWorkflowFailure } =
  await import("../src/utils/workflow-failure-alert");
const originalWebhook = process.env.GEO_SCAN_ALERT_WEBHOOK_URL;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  claims.clear();
  process.env.GEO_SCAN_ALERT_WEBHOOK_URL = "https://example.com/slack";
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  if (originalWebhook === undefined) {
    delete process.env.GEO_SCAN_ALERT_WEBHOOK_URL;
  } else {
    process.env.GEO_SCAN_ALERT_WEBHOOK_URL = originalWebhook;
  }
});

test("sends one alert per run and retries after Slack rejects it", async () => {
  const fetch = mock(async () => new Response("failure", { status: 500 }));
  globalThis.fetch = fetch as typeof globalThis.fetch;
  const input = { runId: "wrun_test", workflow: "schedule-content" };

  await expect(alertWorkflowFailure(input)).rejects.toThrow("HTTP 500");
  expect(claims.size).toBe(0);

  fetch.mockImplementation(async () => new Response("ok"));
  await alertWorkflowFailure(input);
  await alertWorkflowFailure(input);

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(claims.size).toBe(1);
});
