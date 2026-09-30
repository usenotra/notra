import { describe, expect, test } from "bun:test";

import type {
  GeoContentGapsResponse,
  GeoPromptGapRow,
} from "@notra/geo-core/types/geo";

import { withoutPromptGap, withRestoredPromptGap } from "@/utils/geo-gaps";

function gap(id: string, opportunity: number): GeoPromptGapRow {
  return {
    id,
    prompt: `Prompt ${id}`,
    title: null,
    engines: ["openai"],
    mentionedEngines: [],
    competitors: [],
    discoveredCompetitors: [],
    searchQueries: [],
    ownMentionRate: 0,
    engineCoverage: 1,
    opportunity,
    won: false,
    brief: null,
  };
}

function response(promptGaps: GeoPromptGapRow[]): GeoContentGapsResponse {
  return { promptGaps, searchGaps: [], aiSearchGaps: [], hasScanData: true };
}

describe("prompt gap ignore cache", () => {
  test("removes only the ignored gap", () => {
    const next = withoutPromptGap(
      response([gap("a", 3), gap("b", 2), gap("c", 1)]),
      "b"
    );

    expect(next.promptGaps.map((row) => row.id)).toEqual(["a", "c"]);
  });

  test("a failed ignore restores its row without reviving a concurrent ignore", () => {
    const a = gap("a", 3);
    const b = gap("b", 2);
    const initial = response([a, b, gap("c", 1)]);
    // Ignore "a", then "b" before "a" settles; "a" then fails.
    const afterBoth = withoutPromptGap(withoutPromptGap(initial, "a"), "b");
    const rolledBack = withRestoredPromptGap(afterBoth, a);

    expect(rolledBack.promptGaps.map((row) => row.id)).toEqual(["a", "c"]);
  });

  test("restoring keeps opportunity order and never duplicates rows", () => {
    const b = gap("b", 2);
    const restored = withRestoredPromptGap(
      response([gap("a", 3), gap("c", 1)]),
      b
    );

    expect(restored.promptGaps.map((row) => row.id)).toEqual(["a", "b", "c"]);
    expect(withRestoredPromptGap(restored, b)).toBe(restored);
  });
});
