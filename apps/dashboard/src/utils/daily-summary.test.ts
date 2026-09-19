import { expect, test } from "bun:test";

import {
  formatDailySummaryChangeDetail,
  groupDailySummaryItems,
  truncatePrompt,
} from "@/utils/daily-summary";

test("names the competitors that were newly cited", () => {
  expect(formatDailySummaryChangeDetail("citation_added", [])).toBe(
    "Citation gained"
  );
  expect(formatDailySummaryChangeDetail("citation_removed", [])).toBe(
    "Citation lost"
  );
  expect(
    formatDailySummaryChangeDetail("competitor_cited", ["Rival", "Other"])
  ).toBe("Competitor cited: Rival, Other");
});

test("groups changes for the same prompt and engine", () => {
  const grouped = groupDailySummaryItems([
    {
      id: "prompt-1:anthropic",
      title: "Which transcription app should I use?",
      changes: [
        { id: "citation_added", detail: "Citation gained", tone: "up" },
      ],
      engineLabel: "Claude",
    },
    {
      id: "prompt-1:anthropic",
      title: "Which transcription app should I use?",
      changes: [
        { id: "citation_removed", detail: "Citation lost", tone: "down" },
      ],
      engineLabel: "Claude",
    },
  ]);

  expect(grouped).toEqual([
    {
      id: "prompt-1:anthropic",
      title: "Which transcription app should I use?",
      changes: [
        { id: "citation_added", detail: "Citation gained", tone: "up" },
        { id: "citation_removed", detail: "Citation lost", tone: "down" },
      ],
      engineLabel: "Claude",
    },
  ]);
});

test("keeps distinct prompt ids when display titles match", () => {
  const prefix = "a".repeat(80);
  const firstTitle = truncatePrompt(`${prefix} first`, 80);
  const secondTitle = truncatePrompt(`${prefix} second`, 80);
  const grouped = groupDailySummaryItems([
    {
      id: "prompt-1:anthropic",
      title: firstTitle,
      changes: [{ id: "gained_mention", detail: "Gained mention", tone: "up" }],
      engineLabel: "Claude",
    },
    {
      id: "prompt-2:anthropic",
      title: secondTitle,
      changes: [{ id: "lost_mention", detail: "Lost mention", tone: "down" }],
      engineLabel: "Claude",
    },
  ]);

  expect(firstTitle).toBe(secondTitle);
  expect(grouped).toHaveLength(2);
  expect(grouped.map((item) => item.id)).toEqual([
    "prompt-1:anthropic",
    "prompt-2:anthropic",
  ]);
});
