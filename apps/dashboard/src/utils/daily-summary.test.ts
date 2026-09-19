import { expect, test } from "bun:test";

import {
  formatDailySummaryChangeDetail,
  groupDailySummaryItems,
  truncatePrompt,
} from "@/utils/daily-summary";

test("shows citation counts when several domains changed", () => {
  expect(formatDailySummaryChangeDetail("citation_added", 12)).toBe(
    "12 citations added"
  );
  expect(formatDailySummaryChangeDetail("citation_removed", 7)).toBe(
    "7 citations removed"
  );
  expect(formatDailySummaryChangeDetail("citation_added", 1)).toBe(
    "Citation added"
  );
});

test("groups changes for the same prompt and engine", () => {
  const grouped = groupDailySummaryItems([
    {
      id: "prompt-1:anthropic",
      title: "Which transcription app should I use?",
      changes: [{ id: "citation_added", detail: "Citation added", tone: "up" }],
      engineLabel: "Claude",
    },
    {
      id: "prompt-1:anthropic",
      title: "Which transcription app should I use?",
      changes: [
        { id: "citation_removed", detail: "Citation removed", tone: "down" },
      ],
      engineLabel: "Claude",
    },
  ]);

  expect(grouped).toEqual([
    {
      id: "prompt-1:anthropic",
      title: "Which transcription app should I use?",
      changes: [
        { id: "citation_added", detail: "Citation added", tone: "up" },
        { id: "citation_removed", detail: "Citation removed", tone: "down" },
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
