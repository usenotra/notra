import { describe, expect, test } from "bun:test";

import type { GeoShelfCitationRawRow } from "@/types/geo-shelf";
import { groupShelfCitationEngines } from "@/utils/geo-shelf";

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
  test("drops bare homepages so root domains never reach the shelf", () => {
    const pages = foldShelfCitationRows([
      citationRow({ url: "https://e2b.dev/" }),
      citationRow({ url: "https://www.daytona.io" }),
      citationRow({ url: "https://example.com/article" }),
    ]);

    expect(pages.map((page) => page.url)).toEqual([
      "https://example.com/article",
    ]);
  });

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

describe("groupShelfCitationEngines", () => {
  test("collapses models of one provider into a single family", () => {
    const groups = groupShelfCitationEngines([
      "anthropic/claude-sonnet-5-grounded",
      "anthropic/claude-opus-5",
      "ai-overview",
    ]);

    expect(groups.map((group) => group.family)).toEqual(["claude", "google"]);
    expect(groups[0]?.models).toHaveLength(2);
  });
});
