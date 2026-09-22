import { describe, expect, test } from "bun:test";

import { GEO_SCAN_POLL_INTERVAL_MS } from "@notra/geo-core/constants/geo";
import type { GeoScanRunSummary } from "@notra/geo-core/types/geo-scan-history";

import {
  formatScanRunOption,
  geoScanRefetchInterval,
  scanRunDetailView,
} from "@/utils/geo-scan-activity";

const NOW = Date.parse("2026-09-22T12:00:00Z");

function run(overrides: Partial<GeoScanRunSummary> = {}): GeoScanRunSummary {
  return {
    id: "scan-1",
    status: "completed",
    startedAt: "2026-09-22T09:00:00Z",
    finishedAt: "2026-09-22T10:00:00Z",
    plan: {
      totalChecks: 12,
      promptCount: 4,
      sequenceCount: 0,
      engines: ["gpt"],
      languages: ["English"],
    },
    checks: 12,
    mentions: 4,
    ...overrides,
  };
}

describe("scan activity helpers", () => {
  test("labels runs by recency", () => {
    expect(
      formatScanRunOption(run({ status: "running", checks: 3 }), NOW)
    ).toBe("Scanning now");
    expect(formatScanRunOption(run(), NOW)).toBe("2 hours ago");
    expect(formatScanRunOption(run({ status: "failed", checks: 2 }), NOW)).toBe(
      "Stopped early · 2 hours ago"
    );
  });

  test("does not treat placeholder data as a loading flash", () => {
    const view = scanRunDetailView({
      run: run(),
      view: "answers",
      data: {
        status: "completed",
        pendingOffset: 0,
        pending: [],
        pendingTotal: 0,
        results: [],
        total: 12,
      },
      isPending: false,
      pendingOffset: 0,
    });
    expect(view.loading).toBe(false);
    expect(view.answerCount).toBe(12);
  });

  test("polls while a scan is live even before the first rows arrive", () => {
    expect(geoScanRefetchInterval(true)).toBe(GEO_SCAN_POLL_INTERVAL_MS);
    expect(geoScanRefetchInterval(false, "running")).toBe(
      GEO_SCAN_POLL_INTERVAL_MS
    );
    expect(geoScanRefetchInterval(false, "completed")).toBe(false);
    expect(geoScanRefetchInterval(false)).toBe(false);
  });

  test("uses the latest saved count while a scan is still running", () => {
    const view = scanRunDetailView({
      run: run({ status: "running", checks: 5 }),
      view: "answers",
      data: {
        status: "running",
        pendingOffset: 0,
        pending: [],
        pendingTotal: 2,
        results: [],
        total: 3,
      },
      isPending: false,
      pendingOffset: 0,
    });
    expect(view.answerCount).toBe(5);
    expect(view.running).toBe(true);
  });
});
