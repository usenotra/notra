import { mock, spyOn, test } from "bun:test";
import assert from "node:assert/strict";

import { POLL_MS } from "./constants/metrics.ts";

test("failed polls invalidate served snapshot freshness and later polls recover", async () => {
  let handler;
  let tick;
  let failed = false;
  let now = 1_000_000;
  const listeners = new Map(
    ["SIGINT", "SIGTERM"].map((signal) => [signal, process.listeners(signal)])
  );
  mock.module("node:http", () => ({
    createServer: (callback) => {
      handler = callback;
      return { listen() {}, close() {} };
    },
  }));
  mock.module("./utils/poll.ts", () => ({
    pollMetrics: async () => {
      if (failed) {
        throw new Error("fixture poll failed");
      }
      return {
        text: "notra_fixture_window 230\n",
        catalogCount: 1,
        results: [],
      };
    },
  }));
  mock.module("./utils/api.ts", () => ({ vercelApi: () => undefined }));
  spyOn(Date, "now").mockImplementation(() => now);
  spyOn(globalThis, "setInterval").mockImplementation((callback) => {
    tick = callback;
    return 0;
  });
  const metrics = () => {
    let body;
    handler(
      { url: "/metrics" },
      {
        setHeader() {},
        end: (text) => {
          body = text;
        },
      }
    );
    return body;
  };
  try {
    await import("./server.ts");
    assert.match(metrics(), /\nnotra_vercel_snapshot_fresh 1\n/);
    assert.match(metrics(), /\nnotra_fixture_window 230\n/);
    failed = true;
    tick();
    await Promise.resolve();
    assert.match(metrics(), /\nnotra_vercel_catalog_success 0\n/);
    assert.match(metrics(), /\nnotra_vercel_snapshot_fresh 0\n/);
    assert.doesNotMatch(metrics(), /\nnotra_fixture_window /);
    failed = false;
    tick();
    await Promise.resolve();
    assert.match(metrics(), /\nnotra_vercel_catalog_success 1\n/);
    assert.match(metrics(), /\nnotra_vercel_snapshot_fresh 1\n/);
    assert.match(metrics(), /\nnotra_fixture_window 230\n/);
    now += 2 * POLL_MS;
    assert.match(metrics(), /\nnotra_vercel_snapshot_fresh 0\n/);
    assert.doesNotMatch(metrics(), /\nnotra_fixture_window /);
  } finally {
    for (const [signal, previous] of listeners) {
      for (const listener of process.listeners(signal)) {
        if (!previous.includes(listener)) {
          process.removeListener(signal, listener);
        }
      }
    }
    mock.restore();
  }
});
