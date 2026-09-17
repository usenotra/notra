import { describe, expect, test } from "bun:test";

import {
  buildShareOfVoiceChartModel,
  shareOfVoiceOwnTrends,
} from "@/utils/geo-share-of-voice";

const TODAY = "2026-09-17";
const days = (values: number[]) =>
  values.map((value, index) => ({
    day: `2026-09-${String(10 + index).padStart(2, "0")}`,
    value,
  }));

describe("buildShareOfVoiceChartModel", () => {
  test("ranks an unmentioned own brand last instead of leaving it blank", () => {
    const model = buildShareOfVoiceChartModel({
      points: [
        { brand: "Jasper", mentions: 10 },
        { brand: "Profound", mentions: 5 },
      ],
      companyName: "Notra",
    });

    expect(model.own?.rank).toBe(3);
    expect(model.brandCount).toBe(3);
    expect(model.ranking.at(-1)?.own).toBeTrue();
  });
});

describe("shareOfVoiceOwnTrends", () => {
  test("compares share and rank between both halves of the range", () => {
    const rows = [
      {
        id: "a",
        kind: "brand",
        brand: "Jasper",
        mentions: 8,
        share: 0,
        trend: days([4, 4, 0, 0]),
        tracked: true,
      },
      {
        id: "n",
        kind: "brand",
        brand: "Notra",
        mentions: 6,
        share: 0,
        trend: days([1, 1, 2, 2]),
        tracked: true,
      },
    ] as const;
    const trends = shareOfVoiceOwnTrends([...rows], rows[1], TODAY);

    // first half: 2 of 10 (20%), rank 2. second half: 4 of 4 (100%), rank 1.
    expect(trends.shareDelta).toBeCloseTo(80);
    expect(trends.rankDelta).toBe(-1);
  });

  test("returns nothing without enough settled days", () => {
    const rows = [
      {
        id: "n",
        kind: "brand",
        brand: "Notra",
        mentions: 1,
        share: 1,
        trend: days([1]),
        tracked: true,
      },
    ] as const;
    expect(shareOfVoiceOwnTrends([...rows], rows[0], TODAY)).toEqual({
      shareDelta: null,
      rankDelta: null,
    });
  });
});
