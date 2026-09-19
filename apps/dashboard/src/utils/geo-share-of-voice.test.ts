import { describe, expect, test } from "bun:test";

import { buildShareOfVoiceChartModel } from "./geo-share-of-voice";

describe("buildShareOfVoiceChartModel", () => {
  test("counts own-brand alias mentions in the daily sparkline", () => {
    const model = buildShareOfVoiceChartModel({
      companyName: "Acme",
      aliases: ["Acme AI"],
      points: [
        { brand: "Acme", mentions: 2 },
        { brand: "Acme AI", mentions: 1 },
        { brand: "Rival", mentions: 5 },
      ],
      timeseries: [
        { brand: "Acme", day: "2026-09-15", mentions: 1 },
        { brand: "Acme AI", day: "2026-09-15", mentions: 2 },
        { brand: "Rival", day: "2026-09-15", mentions: 3 },
        { brand: "Acme AI", day: "2026-09-16", mentions: 4 },
      ],
    });

    expect(model.own?.id).toBe("brand:Acme");
    expect(model.own?.mentions).toBe(3);
    expect(model.mentionSparklines.get("brand:Acme")).toEqual([
      { day: "2026-09-15", value: 3 },
      { day: "2026-09-16", value: 4 },
    ]);
  });
});
