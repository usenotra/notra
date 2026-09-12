import { expect, test } from "bun:test";

import type { SentimentTheme } from "@notra/geo-core/types/sentiment-analysis";

import { sentimentTableRows } from "./sentiment-table";

test("claim rows retain their own evidence rather than the entire theme sample", () => {
  const first = {
    checkId: "a",
    prompt: "Describe Notra",
    quote: "Setup is quick.",
    engine: "openai",
    capturedAt: "2026-09-01",
  };
  const second = { ...first, checkId: "b", quote: "The guide is clear." };
  const themes: SentimentTheme[] = [
    {
      title: "Onboarding",
      polarity: "positive",
      evidence: [first, second],
      claims: [
        { statement: "Quick setup", evidence: [first] },
        { statement: "Clear guide", evidence: [second] },
      ],
    },
  ];
  const before = JSON.stringify(themes);
  const rows = sentimentTableRows(themes);
  expect(rows).toHaveLength(2);
  expect(rows[0]?.evidence).toEqual([first]);
  expect(rows[1]?.evidence).toEqual([second]);
  expect(rows[0]?.theme).toBe("Onboarding");
  expect(rows[0]?.id).not.toBe(rows[1]?.id);
  expect(JSON.stringify(themes)).toBe(before);
  expect(sentimentTableRows([])).toEqual([]);
});
