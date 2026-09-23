import { expect, test } from "bun:test";

import type { AccuracyAnalysisSample } from "../src/types/accuracy-analysis";
import {
  attachVerdicts,
  scoredAccuracyCounts,
  validateAccuracyClaims,
  verdictFromProbabilities,
} from "../src/utils/accuracy-analysis";

const sample: AccuracyAnalysisSample[] = [
  {
    id: "a",
    answer: "Acme costs $49 per month for the starter plan.",
    prompt: "How much is Acme?",
    engine: "openai",
    capturedAt: "2026-09-01T00:00:00.000Z",
    sources: [],
  },
];

test("drops claims whose quote is not in the answer", () => {
  const claims = validateAccuracyClaims(
    {
      claims: [
        {
          statement: "Acme starter is $49 / month",
          category: "pricing",
          evidence: [{ checkId: "a", quote: "Acme costs $49 per month" }],
        },
        {
          statement: "Invented feature",
          category: "features",
          evidence: [{ checkId: "a", quote: "unlimited seats for free" }],
        },
      ],
    },
    sample
  );
  expect(claims).toHaveLength(1);
  expect(claims[0]?.statement).toBe("Acme starter is $49 / month");
});

test("score uses the 0.6 floor and ignores unverifiable", () => {
  expect(
    verdictFromProbabilities({
      accurate: 0.4,
      inaccurate: 0.35,
      unverifiable: 0.25,
    })
  ).toBe("unverifiable");
  expect(
    scoredAccuracyCounts(
      attachVerdicts(
        [
          { statement: "ok", category: "pricing", evidence: [] },
          { statement: "wrong", category: "pricing", evidence: [] },
          { statement: "unknown", category: "other", evidence: [] },
        ],
        new Map([
          [0, { accurate: 0.9, inaccurate: 0.05, unverifiable: 0.05 }],
          [1, { accurate: 0.05, inaccurate: 0.9, unverifiable: 0.05 }],
          [2, { accurate: 0.4, inaccurate: 0.3, unverifiable: 0.3 }],
        ])
      )
    )
  ).toEqual({ accurate: 1, inaccurate: 1, unverifiable: 1, score: 0.5 });
});
