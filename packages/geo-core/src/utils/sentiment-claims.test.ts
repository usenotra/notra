import { expect, test } from "bun:test";

import { validateSentimentThemes } from "./sentiment-analysis";

test("claims preserve distinct quotes from the same answer without duplicating theme evidence", () => {
  const sample = [
    {
      id: "a",
      sentiment: "positive",
      answer: "Setup is easy. Support is helpful.",
      prompt: "How is the brand?",
      engine: "openai",
      capturedAt: "2026-09-12",
    },
  ];
  const result = validateSentimentThemes(
    {
      themes: [
        {
          title: "Experience",
          polarity: "positive",
          claims: [
            {
              statement: "Easy setup",
              evidence: [{ checkId: "a", quote: "Setup is easy." }],
            },
            {
              statement: "Helpful support",
              evidence: [{ checkId: "a", quote: "Support is helpful." }],
            },
          ],
        },
      ],
    },
    sample
  );
  expect(result[0]?.claims).toHaveLength(2);
  expect(result[0]?.claims?.[1]?.evidence[0]?.quote).toBe(
    "Support is helpful."
  );
  expect(new Set(result[0]?.evidence.map((item) => item.checkId)).size).toBe(1);
});

test("rejects invented quotes, mismatched polarity and duplicate claims", () => {
  const sample = [
    {
      id: "a",
      sentiment: "positive",
      answer: "Setup is easy.",
      prompt: "How is the brand?",
      engine: "openai",
      capturedAt: "2026-09-12",
    },
  ];
  const claim = {
    statement: "Easy setup",
    evidence: [{ checkId: "a", quote: "Setup is easy." }],
  };
  expect(() =>
    validateSentimentThemes(
      { themes: [{ title: "Setup", polarity: "negative", claims: [claim] }] },
      sample
    )
  ).toThrow();
  expect(() =>
    validateSentimentThemes(
      {
        themes: [
          { title: "Setup", polarity: "positive", claims: [claim, claim] },
        ],
      },
      sample
    )
  ).toThrow();
  expect(() =>
    validateSentimentThemes(
      {
        themes: [
          {
            title: "Setup",
            polarity: "positive",
            claims: [
              {
                ...claim,
                evidence: [{ checkId: "a", quote: "Invented quote." }],
              },
            ],
          },
        ],
      },
      sample
    )
  ).toThrow();
});
