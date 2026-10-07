import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { WebPageViewInput } from "../src/types/ingest";

mock.module("@notra/ai/utils/redis", () => ({ redis: null }));
if (process.env.NOTRA_WEB_ANALYTICS_TEST_WORKER !== import.meta.url) {
  test("web-session-fallback runs with process-isolated module mocks", () => {
    const result = spawnSync(
      process.execPath,
      ["test", "--isolate", fileURLToPath(import.meta.url)],
      {
        env: {
          ...process.env,
          NOTRA_WEB_ANALYTICS_TEST_WORKER: import.meta.url,
        },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  }, 35_000);
} else {
  const { buildWebPageView } = await import("../src/ingest/web");

  test("without Redis every view has its own session but retains the daily visitor", async () => {
    const input: WebPageViewInput = {
      identity: { organizationId: "org", projectId: "prj", generation: 1 },
      payload: { method: "GET", url: "https://acme.com/" },
      url: new URL("https://acme.com/"),
      capturedAt: new Date("2026-10-06T12:00:00Z"),
      classification: {
        visitorType: "human",
        source: "human",
        agent: "",
        category: "",
        confidence: "",
      },
    } as WebPageViewInput;
    const rows = await Promise.all([
      buildWebPageView(input),
      buildWebPageView(input),
    ]);
    expect(rows[0]?.visitor_id).toBe(rows[1]?.visitor_id);
    expect(rows[0]?.session_id).not.toBe(rows[1]?.session_id);
    expect(rows.map((row) => row?.session_page_index)).toEqual([0, 0]);
  });
}
