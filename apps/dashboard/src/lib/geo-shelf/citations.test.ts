import { describe, expect, test } from "bun:test";

import type { GeoShelfCitationRawRow } from "@/types/geo-shelf";

import { foldShelfCitationRows } from "./citations";

function citationRow(
  overrides: Partial<GeoShelfCitationRawRow>
): GeoShelfCitationRawRow {
  return {
    url: "https://example.com/article",
    title: null,
    windowCount: 1,
    totalCount: 1,
    promptIds: ["prompt-1"],
    engines: ["openai"],
    checkIds: ["check-1"],
    windowCheckIds: ["check-1"],
    firstCitedAt: "2026-08-01T00:00:00.000Z",
    lastCitedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("foldShelfCitationRows", () => {
  test("counts a mention check once across canonical URL variants", () => {
    const [page] = foldShelfCitationRows([
      citationRow({
        url: "https://www.example.com/article?utm_source=test",
        title: "Older title",
      }),
      citationRow({
        url: "https://example.com/article",
        lastCitedAt: "2026-09-01T00:00:00.000Z",
      }),
    ]);

    expect(page?.citations.totalCount).toBe(1);
    expect(page?.citations.windowCount).toBe(1);
    expect(page?.title).toBe("Older title");
  });

  test("unions overlapping check ids after canonicalization", () => {
    const [page] = foldShelfCitationRows([
      citationRow({
        checkIds: ["check-1", "check-2"],
        windowCheckIds: ["check-1", "check-2"],
        totalCount: 2,
        windowCount: 2,
      }),
      citationRow({
        url: "https://www.example.com/article",
        checkIds: ["check-2", "check-3"],
        windowCheckIds: ["check-2", "check-3"],
        totalCount: 2,
        windowCount: 2,
      }),
    ]);

    expect(page?.citations.totalCount).toBe(3);
    expect(page?.citations.windowCount).toBe(3);
  });
});
