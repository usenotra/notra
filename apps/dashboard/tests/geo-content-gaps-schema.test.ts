import { describe, expect, test } from "bun:test";
import assert from "node:assert/strict";

import { contentGapsResponseSchema } from "@notra/schemas/api/geo-content";

import { DESIGN_SYSTEM_SEARCH_GAPS } from "../src/constants/design-system-gaps";

describe("contentGapsResponseSchema", () => {
  test("preserves scan provenance and validates existing GSC gaps", () => {
    const result = contentGapsResponseSchema.parse({
      promptGaps: [],
      searchGaps: DESIGN_SYSTEM_SEARCH_GAPS,
      hasScanData: true,
      organization: { id: "org", slug: "fixture", name: "Fixture", logo: null },
    });

    expect(result.searchGaps).toEqual(DESIGN_SYSTEM_SEARCH_GAPS);
    const scan = result.searchGaps.find((row) => row.source === "scan");
    assert.ok(scan);
    expect(scan.scanEvidence).toHaveLength(1);
    expect(scan.scanEvidence[0]).toMatchObject({
      checkId: "demo-check",
      scanId: "demo-scan",
      engine: "openai/gpt-5",
      promptId: "demo-origin",
      query: "serverless postgres connection pooling comparison",
      capturedAt: "2026-09-25T08:30:00.000Z",
      language: "English",
    });
    expect(scan.impressions).toBeNull();
    expect(scan.clicks).toBeNull();
    expect(scan.position).toBeNull();
    const gsc = result.searchGaps.find(
      (row) => row.source === "search_console"
    );
    assert.ok(gsc);
    expect(gsc.scanEvidence).toEqual([]);
    expect(gsc.impressions).toBeGreaterThan(0);
  });

  test("rejects unknown or missing sources and malformed provenance", () => {
    const scan = DESIGN_SYSTEM_SEARCH_GAPS.find((row) => row.source === "scan");
    assert.ok(scan);
    const evidence = scan.scanEvidence[0];
    assert.ok(evidence);
    for (const invalid of [
      { source: "other" },
      { source: undefined },
      { scanEvidence: undefined },
      { scanEvidence: null },
      { scanEvidence: [{}] },
      { scanEvidence: [{ ...evidence, checkId: 42 }] },
      { scanEvidence: [{ ...evidence, prompt: undefined }] },
      { scanEvidence: [{ ...evidence, query: null }] },
      { scanEvidence: [{ ...evidence, language: 42 }] },
      { scanEvidence: [{ ...evidence, capturedAt: "not-a-date" }] },
    ]) {
      expect(
        contentGapsResponseSchema.safeParse({
          promptGaps: [],
          searchGaps: [{ ...scan, ...invalid }],
          hasScanData: true,
          organization: {
            id: "org",
            slug: "fixture",
            name: "Fixture",
            logo: null,
          },
        }).success
      ).toBe(false);
    }
  });
});
