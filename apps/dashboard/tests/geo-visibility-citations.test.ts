import { describe, expect, test } from "bun:test";

import { GEO_MENTION_TREND_TOTAL_KEY } from "@notra/geo-core/constants/geo";

import {
  buildMentionTrendRows,
  mentionOverviewTotals,
} from "@/utils/geo-charts";
import { promptOutcomeLabel } from "@/utils/geo-prompt-history";

describe("owned-source visibility", () => {
  test("counts a citation once when a check is also a mention", () => {
    const totals = mentionOverviewTotals([
      {
        engine: "openai/gpt-5.4-grounded",
        checks: 3,
        mentions: 1,
        mentionRate: 1 / 3,
        citations: 2,
        visibility: 2,
        visibilityRate: 2 / 3,
        avgPosition: 1,
        lastCheckedAt: "2026-09-12T00:00:00.000Z",
      },
    ]);

    expect(totals).toEqual({ mentions: 2, checks: 3, rate: 2 / 3 });
  });

  test("plots combined visibility instead of adding mentions and citations", () => {
    const { rows } = buildMentionTrendRows([
      {
        day: "2026-09-12",
        engine: "openai/gpt-5.4-grounded",
        checks: 3,
        mentions: 1,
        citations: 2,
        visibility: 2,
      },
    ]);

    expect(rows.at(-1)?.[GEO_MENTION_TREND_TOTAL_KEY]).toBe(2);
  });

  test("labels citation-only prompt results explicitly", () => {
    expect(promptOutcomeLabel(false, true)).toBe("Owned source cited");
    expect(promptOutcomeLabel(true, true)).toBe("Mentioned and cited");
  });
});
