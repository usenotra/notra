import { describe, expect, test } from "bun:test";

import { suggestionKeywordTotals } from "../src/utils/geo-prompt-suggestions";

const keywords = [
  { query: "market my ai tool", clicks: 0, impressions: 57, position: 8.7 },
  { query: "changelog tools", clicks: 2, impressions: 18, position: 5.3 },
];

describe("suggestionKeywordTotals", () => {
  test("sums impressions and clicks and keeps the best position", () => {
    expect(suggestionKeywordTotals(keywords)).toEqual({
      impressions: 75,
      clicks: 2,
      position: 5.3,
      ctr: (2 / 75) * 100,
    });
  });

  test("returns empty totals when there are no queries", () => {
    expect(suggestionKeywordTotals([])).toEqual({
      impressions: 0,
      clicks: 0,
      position: null,
      ctr: null,
    });
  });
});
