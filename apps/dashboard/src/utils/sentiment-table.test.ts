import { describe, expect, test } from "bun:test";

import type { SentimentTheme } from "@notra/geo-core/types/sentiment-analysis";

import { sentimentTableRows } from "./sentiment-table";

describe("sentiment evidence table", () => {
  test("deduplicates answers across themes while preserving different exact quotes", () => {
    const evidence = {
      checkId: "saved-check-1",
      prompt: "Which tool is easy to use?",
      quote: "Setup is quick.",
      engine: "openai/gpt-4.1-mini",
      capturedAt: "2026-09-01T00:00:00Z",
    };
    const themes: SentimentTheme[] = [
      { title: "Quick setup", polarity: "positive", evidence: [evidence] },
      {
        title: "Easy onboarding",
        polarity: "positive",
        evidence: [evidence, { ...evidence, quote: "The guide is clear." }],
      },
    ];
    const before = JSON.stringify(themes);
    const answers = sentimentTableRows(themes, "answers");
    expect(answers).toHaveLength(1);
    expect(answers[0]?.title).toBe(evidence.prompt);
    expect(answers[0]?.evidence.map((item) => item.quote)).toEqual([
      "Setup is quick.",
      "The guide is clear.",
    ]);
    expect(JSON.stringify(themes)).toBe(before);
    expect(sentimentTableRows(themes, "themes")).toHaveLength(2);
  });

  test("keeps separate saved checks for the same prompt and preserves polarity", () => {
    const themes: SentimentTheme[] = [
      {
        title: "Missing reporting",
        polarity: "negative",
        evidence: ["check-1", "check-2"].map((checkId) => ({
          checkId,
          prompt: "Which analytics tool?",
          quote: "Reporting is limited.",
          engine: "openai/gpt-4.1-mini",
          capturedAt: "2026-09-01T00:00:00Z",
        })),
      },
    ];
    const answers = sentimentTableRows(themes, "answers");
    expect(answers).toHaveLength(2);
    expect(answers.map((row) => row.polarity)).toEqual([
      "negative",
      "negative",
    ]);
    expect(sentimentTableRows([], "answers")).toEqual([]);
  });
});
