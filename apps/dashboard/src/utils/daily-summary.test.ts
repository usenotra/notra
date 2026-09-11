import { describe, expect, test } from "bun:test";

import {
  emptyChangesSummary,
  formatMentionRateDelta,
  isUnchangedDailySummary,
} from "@/utils/daily-summary";

describe("isUnchangedDailySummary", () => {
  test("returns true when mention rate and net prompts are unchanged", () => {
    expect(
      isUnchangedDailySummary({
        yesterday: { checks: 100, mentions: 3, rate: 0.03 },
        previousDay: { checks: 100, mentions: 3, rate: 0.03 },
        changes: {
          ...emptyChangesSummary(),
          gained: 2,
          lost: 2,
          positionDropped: 3,
        },
      })
    ).toBe(true);
  });

  test("returns false when mention rate moved", () => {
    expect(
      isUnchangedDailySummary({
        yesterday: { checks: 100, mentions: 4, rate: 0.04 },
        previousDay: { checks: 100, mentions: 3, rate: 0.03 },
        changes: emptyChangesSummary(),
      })
    ).toBe(false);
  });

  test("returns false when net prompts changed", () => {
    expect(
      isUnchangedDailySummary({
        yesterday: { checks: 100, mentions: 3, rate: 0.03 },
        previousDay: { checks: 100, mentions: 3, rate: 0.03 },
        changes: { ...emptyChangesSummary(), gained: 0, lost: 2 },
      })
    ).toBe(false);
  });

  test("returns false when citations changed", () => {
    expect(
      isUnchangedDailySummary({
        yesterday: { checks: 100, mentions: 3, rate: 0.03 },
        previousDay: { checks: 100, mentions: 3, rate: 0.03 },
        changes: { ...emptyChangesSummary(), citationsAdded: 1 },
      })
    ).toBe(false);
  });
});

describe("formatMentionRateDelta", () => {
  test("labels zero-point moves as unchanged", () => {
    expect(formatMentionRateDelta(0.03, 0.03)).toBe("unchanged");
  });
});
