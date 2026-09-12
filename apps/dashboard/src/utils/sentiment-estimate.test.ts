import { describe, expect, test } from "bun:test";

import { sentimentTailEstimate } from "./sentiment-estimate";

function points(scores: (number | null)[]) {
  return scores.map((score, index) => ({
    day: `2026-09-${String(index + 1).padStart(2, "0")}`,
    score,
  }));
}

describe("sentiment estimated continuation", () => {
  test("anchors the regression continuation to the last real score", () => {
    const input = points([40, 50, 60, null, null]);
    const before = JSON.stringify(input);
    expect(sentimentTailEstimate(input, "2026-09-11")).toEqual([
      null,
      null,
      60,
      70,
      80,
    ]);
    expect(JSON.stringify(input)).toBe(before);
  });

  test("does not estimate internal gaps or leading missing days", () => {
    const result = sentimentTailEstimate(
      points([null, 40, null, 50, 60, null]),
      "2026-09-11"
    );
    expect(result.slice(0, 4)).toEqual([null, null, null, null]);
    expect(result[4]).toBe(60);
    expect(result[5]).toBeGreaterThan(60);
  });

  test("requires three completed observed days and a missing tail", () => {
    expect(sentimentTailEstimate(points([40, 50, null]), "2026-09-11")).toEqual(
      [null, null, null]
    );
    expect(
      sentimentTailEstimate(points([40, 50, 60, null]), "2026-09-03")
    ).toEqual([null, null, null, null]);
    expect(sentimentTailEstimate(points([40, 50, 60]), "2026-09-11")).toEqual([
      null,
      null,
      null,
    ]);
    expect(sentimentTailEstimate(points([null, null]), "2026-09-11")).toEqual([
      null,
      null,
    ]);
    expect(sentimentTailEstimate([], "2026-09-11")).toEqual([]);
  });

  test("stays inside the sentiment scale including a genuine zero", () => {
    expect(
      sentimentTailEstimate(points([80, 90, 100, null, null]), "2026-09-11")
    ).toEqual([null, null, 100, 100, 100]);
    expect(
      sentimentTailEstimate(points([30, 15, 0, null, null]), "2026-09-11")
    ).toEqual([null, null, 0, 0, 0]);
  });

  test("stops after three missing days", () => {
    expect(
      sentimentTailEstimate(
        points([40, 50, 60, null, null, null, null]),
        "2026-09-11"
      )
    ).toEqual([null, null, 60, 70, 80, 90, null]);
  });
});
