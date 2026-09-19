import { expect, test } from "bun:test";

import {
  formatDailySummaryChangeDetail,
  groupDailySummaryItems,
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
      title: "Which transcription app should I use?",
      changes: [{ detail: "Citation added", tone: "up" }],
      engineLabel: "Claude",
    },
    {
      title: "Which transcription app should I use?",
      changes: [{ detail: "Citation removed", tone: "down" }],
      engineLabel: "Claude",
    },
  ]);

  expect(grouped).toEqual([
    {
      title: "Which transcription app should I use?",
      changes: [
        { detail: "Citation added", tone: "up" },
        { detail: "Citation removed", tone: "down" },
      ],
      engineLabel: "Claude",
    },
  ]);
});
